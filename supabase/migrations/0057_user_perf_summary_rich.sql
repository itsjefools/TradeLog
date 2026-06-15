-- 0057: 記録タブのダッシュボード強化。get_user_perf_summary に指標を追加。
--  勝敗数・平均/最高/最低損益・合計pips を返し、勝率リングや追加KPIを描画可能にする。
--  trades は非公開（RLS）のため security definer 集計で返す。期間は p_since 以降。
-- idempotent

drop function if exists public.get_user_perf_summary(uuid, timestamptz);
create or replace function public.get_user_perf_summary(p_user uuid, p_since timestamptz)
returns table (
  win_rate       numeric,
  trade_count    bigint,
  win_count      bigint,
  loss_count     bigint,
  cumulative_pnl numeric,
  avg_pnl        numeric,
  best_pnl       numeric,
  worst_pnl      numeric,
  profit_factor  numeric,
  avg_rr         numeric,
  avg_pips       numeric,
  total_pips     numeric,
  max_streak     integer
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
    count(*) as trade_count,
    count(*) filter (where result = 'win')  as win_count,
    count(*) filter (where result = 'loss') as loss_count,
    coalesce(sum(pnl), 0) as cumulative_pnl,
    round(avg(pnl), 0) as avg_pnl,
    -- 最大利益は利益(>0)のみ、最大損失は損失(<0)のみで算出（符号の取り違え防止）
    max(pnl) filter (where pnl > 0) as best_pnl,
    min(pnl) filter (where pnl < 0) as worst_pnl,
    case
      when sum(pnl) filter (where pnl < 0) is null
        or sum(pnl) filter (where pnl < 0) = 0 then null
      else round(
        coalesce(sum(pnl) filter (where pnl > 0), 0)
        / abs(sum(pnl) filter (where pnl < 0)), 2
      ) end as profit_factor,
    case
      when avg(pnl) filter (where result = 'win') is null
        or avg(pnl) filter (where result = 'loss') is null
        or avg(pnl) filter (where result = 'loss') = 0 then null
      else round(
        avg(pnl) filter (where result = 'win')
        / abs(avg(pnl) filter (where result = 'loss')), 1
      ) end as avg_rr,
    round(avg(pnl_pips), 1) as avg_pips,
    coalesce(sum(pnl_pips), 0) as total_pips,
    (select s from maxs) as max_streak
  from t;
$$;

grant execute on function public.get_user_perf_summary(uuid, timestamptz) to authenticated;
