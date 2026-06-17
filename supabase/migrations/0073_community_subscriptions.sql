-- 0073 有料コミュニティ サブスクリプションのマッピング
-- ============================================================================
-- 自動更新(renewal)のストア通知には「どのコミュニティの課金か」が含まれないため、
-- 初回購入時にストアの一意識別子 → コミュニティ/作成者/購読者 の対応を保存する。
-- renewal webhook はこの表を引いて、対象コミュニティの収益を記帳する。
--
--   apple:  original_transaction_id をキーにする
--   google: purchase_token をキーにする
--   （nullは互いに distinct なので、apple行のpurchase_token=null等は unique を妨げない）
--
-- 書き込みはサーバ(service role / Edge Function)のみ。冪等。
-- ============================================================================

create table if not exists public.community_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  community_id             uuid not null references public.communities(id) on delete cascade,
  creator_id               uuid not null references auth.users(id) on delete cascade,
  subscriber_id            uuid not null references auth.users(id) on delete cascade,
  price_tier_key           text,
  product_id               text,
  store                    text check (store in ('apple', 'google')),
  original_transaction_id  text,   -- apple のマッピングキー
  purchase_token           text,   -- google のマッピングキー
  status                   text not null default 'active'
                           check (status in ('active', 'expired', 'cancelled')),
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (store, original_transaction_id),
  unique (store, purchase_token)
);

create index if not exists idx_comm_subs_oid
  on public.community_subscriptions (original_transaction_id);
create index if not exists idx_comm_subs_token
  on public.community_subscriptions (purchase_token);
create index if not exists idx_comm_subs_subscriber
  on public.community_subscriptions (subscriber_id);

-- RLS: 購読者・作成者は自分が関わる行のみ参照。書き込みはサーバのみ。
alter table public.community_subscriptions enable row level security;
drop policy if exists "comm_subs_read_own" on public.community_subscriptions;
create policy "comm_subs_read_own"
  on public.community_subscriptions for select
  using (auth.uid() = subscriber_id or auth.uid() = creator_id);
