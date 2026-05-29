-- TradeLog: 表示単位を pips / points で切り替え可能に
-- profiles.pip_unit: 'pips' (デフォルト) or 'points'。表示専用(値はそのまま)。
-- このマイグレーションは idempotent

alter table public.profiles
  add column if not exists pip_unit text not null default 'pips' check (pip_unit in ('pips', 'points'));
