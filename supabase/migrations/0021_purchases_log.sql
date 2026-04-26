-- TradeLog: 課金監査ログ（任意）
--
-- RevenueCat が真のソース・オブ・トゥルース。このテーブルはあくまで
-- クライアント側で記録する補助的な監査ログ。
-- profile.is_premium の同期も RevenueCat の customerInfo を見て行う。
--
-- このマイグレーションは idempotent

create table if not exists public.purchases_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      text not null,
  transaction_id  text,
  platform        text not null check (platform in ('ios', 'android', 'web')),
  raw             jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists purchases_log_user_idx
  on public.purchases_log (user_id, created_at desc);

alter table public.purchases_log enable row level security;

drop policy if exists "purchases_log_insert_own" on public.purchases_log;
drop policy if exists "purchases_log_select_own" on public.purchases_log;

-- 自分のログのみ insert / select 可能
create policy "purchases_log_insert_own"
  on public.purchases_log for insert
  with check (auth.uid() = user_id);

create policy "purchases_log_select_own"
  on public.purchases_log for select
  using (auth.uid() = user_id);

comment on table public.purchases_log is
  '課金監査ログ。RevenueCat が真のソース・オブ・トゥルースで、これは補助';
