-- 0055: プロフィール表示用の全期間ユーザー統計（他ユーザーの成績表示用）
--  trades は非公開（is_shared 撤去）のためクライアントからは集計できない。
--  security definer の集計RPCで、プロフィールの成績3枠に必要な指標を返す。
-- idempotent

drop function if exists public.get_user_stats(uuid);
create or replace function public.get_user_stats(p_user uuid)
returns table (
  win_rate        numeric,
  streak          integer,
  max_streak      integer,
  cumulative_pnl  numeric,
  trade_count     bigint,
  avg_rr          numeric,
  profit_factor   numeric,
  month_pnl       numeric,
  best_pair       text,
  avg_pips        numeric
)
language sql
security definer
set search_path = public
as $$
  with t as (
    select currency_pair, result, pnl, pnl_pips, traded_at
    from public.trades
    where user_id = p_user
  ),
  resolved as (
    select result, traded_at from t where result in ('win', 'loss')
  ),
  cur as (
    -- 直近からの連勝（最初の負けが出るまでの勝ち数）
    select count(*)::int as s
    from (
      select result,
        sum(case when result = 'loss' then 1 else 0 end)
          over (order by traded_at desc) as lc
      from resolved
    ) x
    where lc = 0
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
  ),
  bp as (
    select currency_pair
    from t
    group by currency_pair
    order by coalesce(sum(pnl), 0) desc
    limit 1
  )
  select
    case when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        count(*) filter (where result = 'win')::numeric
        / count(*) filter (where result in ('win', 'loss')) * 100
      ) end as win_rate,
    (select s from cur) as streak,
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
    coalesce(
      sum(pnl) filter (
        where date_trunc('month', traded_at) = date_trunc('month', now())
      ), 0
    ) as month_pnl,
    (select currency_pair from bp) as best_pair,
    round(avg(pnl_pips), 1) as avg_pips
  from t;
$$;

grant execute on function public.get_user_stats(uuid) to authenticated;
