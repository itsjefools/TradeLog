-- TradeLog: profiles に push_token カラムを追加
--
-- Expo Push Token を保存する。デバイスが変わると更新される。
-- このマイグレーションは idempotent

alter table public.profiles
  add column if not exists push_token text;

comment on column public.profiles.push_token is
  'Expo Push Token。デバイス1台分のみ保持（複数デバイスは将来対応）';
