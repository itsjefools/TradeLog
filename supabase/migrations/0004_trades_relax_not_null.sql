-- TradeLog: trades の任意項目を NULL 許容に統一する
--
-- 背景:
--   trades テーブルは既存のSQLで作成されていたため、
--   想定より多くのカラムに NOT NULL 制約が残っている。
--   フォームで任意扱いの項目を NULL 許容に揃える。
--
-- 対象カラム: exit_price, pnl, pnl_pips, memo, result
-- （drop not null は既に NULL 許容のカラムに対しても安全なので idempotent）

alter table public.trades alter column exit_price drop not null;
alter table public.trades alter column pnl        drop not null;
alter table public.trades alter column pnl_pips   drop not null;
alter table public.trades alter column memo       drop not null;
alter table public.trades alter column result     drop not null;
