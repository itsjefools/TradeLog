-- 0056: 他ユーザーのプロフィール「記録」タブ用の期間集計（直近 1週間〜1年）。
--  trades は非公開（is_shared 撤去・RLS）のためクライアントからは集計できない。
--  security definer の集計RPCで、期間指定のサマリ・時系列・ペア別を返す。
--  ユーザーが取引を更新するたびにこの集計結果（=グラフ）が変化する。
-- idempotent

-- 旧バージョン（0056 初版）を掃除
drop function if exists public.get_user_monthly_stats(uuid);
drop function if exists public.get_user_pair_stats(uuid);

-- 期間サマリ（ヘッドライン累計損益 + KPIグリッド用）
drop function if exists public.get_user_perf_summary(uuid, timestamptz);
create or replace function public.get_user_perf_summary(p_user uuid, p_since timestamptz)
returns table (
  win_rate       numeric,
  max_streak     integer,
  cumulative_pnl numeric,
  trade_count    bigint,
  avg_rr         numeric,
  profit_factor  numeric,
  avg_pips       numeric
)
language sql
security definer
set search_path = public
as $$
  with t as (
    select result, pnl, pnl_pips, traded_at
    from public.trades
    where user_id = p_user
      and (p_since is null or traded_at >= p_since)
  ),
  resolved as (
    select result, traded_at from t where result in ('win', 'loss')
  ),
  maxs as (
    -- 最大連勝（gaps-and-islands）
    select coalesce(max(cnt), 0)::int as s
    from (
      select count(*) as cnt
      from (
        select result,
          row_number() over (order by traded_at)
            - row_number() over (partition by result order by traded_at) as grp
        from resolved
      ) g
      where result = 'win'
      group by grp
    ) gg
  )
  select
    case when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        count(*) filter (where result = 'win')::numeric
        / count(*) filter (where result in ('win', 'loss')) * 100
      ) end as win_rate,
    (select s from maxs) as max_streak,
    coalesce(sum(pnl), 0) as cumulative_pnl,
    count(*) as trade_count,
    case
      when avg(pnl) filter (where result = 'win') is null
        or avg(pnl) filter (where result = 'loss') is null
        or avg(pnl) filter (where result = 'loss') = 0 then null
      else round(
        avg(pnl) filter (where result = 'win')
        / abs(avg(pnl) filter (where result = 'loss')), 1
      ) end as avg_rr,
    case
      when sum(pnl) filter (where pnl < 0) is null
        or sum(pnl) filter (where pnl < 0) = 0 then null
      else round(
        coalesce(sum(pnl) filter (where pnl > 0), 0)
        / abs(sum(pnl) filter (where pnl < 0)), 2
      ) end as profit_factor,
    round(avg(pnl_pips), 1) as avg_pips
  from t;
$$;

grant execute on function public.get_user_perf_summary(uuid, timestamptz) to authenticated;

-- 時系列（資産曲線 / 損益バー用）。p_bucket = 'day' | 'week' | 'month'
drop function if exists public.get_user_series(uuid, timestamptz, text);
create or replace function public.get_user_series(
  p_user uuid,
  p_since timestamptz,
  p_bucket text
)
returns table (
  bucket      timestamptz,
  pnl         numeric,
  trade_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc(coalesce(p_bucket, 'day'), traded_at) as bucket,
    coalesce(sum(pnl), 0)                            as pnl,
    count(*)                                         as trade_count
  from public.trades
  where user_id = p_user
    and (p_since is null or traded_at >= p_since)
  group by 1
  order by 1;
$$;

grant execute on function public.get_user_series(uuid, timestamptz, text) to authenticated;

-- 通貨ペア別（内訳バー用）
drop function if exists public.get_user_pair_stats(uuid, timestamptz);
create or replace function public.get_user_pair_stats(p_user uuid, p_since timestamptz)
returns table (
  currency_pair text,
  pnl           numeric,
  trade_count   bigint
)
language sql
security definer
set search_path = public
as $$
  select
    currency_pair,
    coalesce(sum(pnl), 0) as pnl,
    count(*)              as trade_count
  from public.trades
  where user_id = p_user
    and (p_since is null or traded_at >= p_since)
  group by currency_pair
  order by count(*) desc
  limit 8;
$$;

grant execute on function public.get_user_pair_stats(uuid, timestamptz) to authenticated;
