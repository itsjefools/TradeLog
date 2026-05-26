-- TradeLog: 月間ランキング RPC に「検証済みのみ」フィルタを追加
--
-- verified_only = true のとき、MT5取込(source = 'mt5_import')の取引のみを集計対象にする。
-- これにより、自己申告でない検証済みの成績だけのランキング/リーグを表示できる。
--
-- category: 'pnl' | 'pips' | 'winrate' | 'overall'（0012 と同じ）
-- このマイグレーションは idempotent

drop function if exists public.get_monthly_ranking(integer);
drop function if exists public.get_monthly_ranking(integer, text);
drop function if exists public.get_monthly_ranking(integer, text, boolean);

create or replace function public.get_monthly_ranking(
  top_n integer default 50,
  category text default 'pnl',
  verified_only boolean default false
)
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
  win_rate       numeric,
  overall_score  numeric
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
      and (not verified_only or t.source = 'mt5_import')
    group by t.user_id
  ),
  enriched as (
    select
      m.*,
      case
        when (m.win_count + m.loss_count) = 0 then null
        else round(m.win_count::numeric / (m.win_count + m.loss_count) * 100, 1)
      end as win_rate
    from monthly m
  ),
  bounds as (
    select
      max(total_pnl) as max_pnl, min(total_pnl) as min_pnl,
      max(total_pips) as max_pips, min(total_pips) as min_pips,
      max(coalesce(win_rate, 0)) as max_wr, min(coalesce(win_rate, 0)) as min_wr
    from enriched
  ),
  scored as (
    select
      e.*,
      case when (b.max_pnl - b.min_pnl) = 0 then 0
        else (e.total_pnl - b.min_pnl) / (b.max_pnl - b.min_pnl) end as norm_pnl,
      case when (b.max_pips - b.min_pips) = 0 then 0
        else (e.total_pips - b.min_pips) / (b.max_pips - b.min_pips) end as norm_pips,
      case when (b.max_wr - b.min_wr) = 0 then 0
        else (coalesce(e.win_rate, 0) - b.min_wr) / (b.max_wr - b.min_wr) end as norm_wr
    from enriched e cross join bounds b
  )
  select
    p.id           as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.nationality,
    p.is_verified,
    p.trade_style,
    s.trade_count,
    s.total_pnl,
    s.total_pips,
    s.win_count,
    s.loss_count,
    s.win_rate,
    round((s.norm_pnl * 0.4 + s.norm_pips * 0.3 + s.norm_wr * 0.3)::numeric, 4) as overall_score
  from scored s
  join public.profiles p on p.id = s.user_id
  where
    case category
      when 'winrate' then (s.win_count + s.loss_count) >= 5
      else true
    end
  order by
    case category when 'pnl'     then s.total_pnl                    end desc nulls last,
    case category when 'pips'    then s.total_pips                   end desc nulls last,
    case category when 'winrate' then s.win_rate                     end desc nulls last,
    case category when 'overall' then
      (s.norm_pnl * 0.4 + s.norm_pips * 0.3 + s.norm_wr * 0.3)
    end desc nulls last,
    s.trade_count desc
  limit top_n;
$$;

comment on function public.get_monthly_ranking(integer, text, boolean) is
  '月間ランキング (category: pnl|pips|winrate|overall, verified_only: MT5取込のみ集計)';

grant execute on function public.get_monthly_ranking(integer, text, boolean) to authenticated;
