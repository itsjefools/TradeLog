-- TradeLog: 月間目標 + 取引メモの3段階化
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. profiles.monthly_pnl_goal（円）
-- ============================================================================

alter table public.profiles
  add column if not exists monthly_pnl_goal numeric(18, 2);

comment on column public.profiles.monthly_pnl_goal is
  '月間P&L目標（円）。null なら未設定';

-- ============================================================================
-- 2. trades のメモを3段階に拡張
--   memo (既存)         : エントリー前の根拠
--   post_memo (新規)    : エグジット後の所感
--   review_memo (新規)  : 後日の振り返り
-- ============================================================================

alter table public.trades
  add column if not exists post_memo text;

alter table public.trades
  add column if not exists review_memo text;

comment on column public.trades.memo is        'エントリー前のメモ（取引の根拠）';
comment on column public.trades.post_memo is   'エグジット後のメモ（実際の値動きへの感想）';
comment on column public.trades.review_memo is '後日の振り返り（次回への教訓）';
