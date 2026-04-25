-- TradeLog: 取引結果(result) カラム追加 + entry_price を任意化
--
-- 変更点:
--   1. trade_result enum (win/loss) を作成
--   2. trades.result カラムを追加（NULL許容、利確/損切り）
--   3. trades.entry_price を NULL 許容に変更（クイック記録のため）
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. trade_result enum
-- ============================================================================

do $$ begin
  create type trade_result as enum ('win', 'loss');
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 2. trades.result カラム追加
-- ============================================================================

alter table public.trades
  add column if not exists result trade_result;

comment on column public.trades.result is '取引結果: win=利確, loss=損切り。任意項目';

-- ============================================================================
-- 3. trades.entry_price を NULL 許容に
-- ============================================================================

alter table public.trades
  alter column entry_price drop not null;
