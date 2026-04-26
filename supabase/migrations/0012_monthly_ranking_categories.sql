-- TradeLog: 月間ランキング RPC を 4 カテゴリ対応に拡張
--
-- 引数 category: 'pnl' | 'pips' | 'winrate' | 'overall'
--   pnl     - 月間 P&L 合計の降順
--   pips    - 月間 pips 合計の降順
--   winrate - 勝率の降順（最低 5 取引必要）
--   overall - 利益・pips・勝率の正規化スコアの平均
--
-- このマイグレーションは idempotent

drop function if exists public.get_monthly_ranking(integer);
drop function if exists public.get_monthly_ranking(integer, text);

create or replace function public.get_monthly_ranking(
  top_n integer default 50,
  category text default 'pnl'
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
  -- 各指標の min / max を計算（正規化用）
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
      -- 各指標を 0..1 に正規化（rangeが0なら0扱い）
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
    -- 総合スコア = 利益40% + pips30% + 勝率30%
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

comment on function public.get_monthly_ranking(integer, text) is
  '月間ランキング (category: pnl|pips|winrate|overall)';

grant execute on function public.get_monthly_ranking(integer, text) to authenticated;
