-- TradeLog: 月間ランキング用 RPC
--
-- 全ユーザーの今月のトレード集計を返す。
-- security definer で RLS をバイパスし、集計結果のみ返すため
-- 個別の取引内容は外部に漏れない（user_id・名前・集計値のみ）。
--
-- このマイグレーションは idempotent

-- 戻り値型
drop function if exists public.get_monthly_ranking(integer);

create or replace function public.get_monthly_ranking(top_n integer default 50)
returns table (
  user_id        uuid,
  username       text,
  display_name   text,
  avatar_url     text,
  nationality    text,
  is_verified    boolean,
  trade_style    text,
  trade_count    bigint,
  total_pnl      numeric,
  total_pips     numeric,
  win_count      bigint,
  loss_count     bigint,
  win_rate       numeric
)
language sql
security definer
set search_path = public
as $$
  with monthly as (
    select
      t.user_id,
      count(*)                                                 as trade_count,
      coalesce(sum(t.pnl), 0)                                  as total_pnl,
      coalesce(sum(t.pnl_pips), 0)                             as total_pips,
      count(*) filter (where t.result = 'win')                 as win_count,
      count(*) filter (where t.result = 'loss')                as loss_count
    from public.trades t
    where t.traded_at >= date_trunc('month', now())
      and t.traded_at <  date_trunc('month', now()) + interval '1 month'
    group by t.user_id
  )
  select
    p.id           as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.nationality,
    p.is_verified,
    p.trade_style,
    m.trade_count,
    m.total_pnl,
    m.total_pips,
    m.win_count,
    m.loss_count,
    case
      when (m.win_count + m.loss_count) = 0 then null
      else round(m.win_count::numeric / (m.win_count + m.loss_count) * 100, 1)
    end as win_rate
  from monthly m
  join public.profiles p on p.id = m.user_id
  order by m.total_pnl desc nulls last, m.trade_count desc
  limit top_n;
$$;

comment on function public.get_monthly_ranking(integer) is
  '月間ランキングを取得（今月のtotal_pnl降順）。RLSをバイパスするが集計結果のみ返す。';

-- 認証済みユーザーから呼び出し可能
grant execute on function public.get_monthly_ranking(integer) to authenticated;
