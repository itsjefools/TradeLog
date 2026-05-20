-- profiles.currency: ユーザーが取引記録で使う通貨単位
-- 言語と独立して設定できる (例: 英語UI でも JPY で記録する人がいる)
-- 既存ユーザーは 'JPY' を初期値とする

alter table public.profiles
  add column if not exists currency text default 'JPY' not null;

-- サポート通貨のチェック制約 (将来追加しやすいよう列挙)
alter table public.profiles
  drop constraint if exists profiles_currency_check;

alter table public.profiles
  add constraint profiles_currency_check
  check (currency in ('JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD', 'BRL', 'MXN'));

comment on column public.profiles.currency is
  'ユーザーが取引記録で使う通貨単位 (P&L表示などに反映)。言語設定とは独立。';
