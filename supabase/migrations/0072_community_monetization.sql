-- 0072 有料コミュニティ収益化 フェーズ1: スキーマ
-- ============================================================================
-- マーケットプレイス型(作成者85% / TradeLog15%・IAP)の土台となるテーブル群。
-- 設計の詳細・意思決定は docs/community-monetization.md を参照。
--
-- この移行では「スキーマ + RLS」のみを用意する。実際の購入検証(Edge Function)・
-- IAP商品登録・月次ペイアウト処理は後続フェーズで実装する。
--
-- 重要: 収益台帳(community_earnings)・ペイアウト(creator_payouts)への書き込みは
--       サーバ(service role / Edge Function)のみ。クライアントは自分の分の参照だけ。
-- 冪等。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. community_price_tiers: 固定価格ティア（IAP商品に対応）
--    IAPは任意価格を扱えないため、許可する月額をこの表で定義し、作成者は選ぶだけ。
-- ----------------------------------------------------------------------------
create table if not exists public.community_price_tiers (
  tier_key                text primary key,             -- 'tier_980'
  amount                  integer not null,             -- 月額
  currency                text not null default 'JPY',
  iap_product_id_ios      text,                         -- App Store の商品ID（後で設定）
  iap_product_id_android  text,                         -- Google Play の商品ID（後で設定）
  is_active               boolean not null default true,
  sort_order              integer not null default 0
);

insert into public.community_price_tiers (tier_key, amount, sort_order) values
  ('tier_480',   480, 1),
  ('tier_980',   980, 2),
  ('tier_1980', 1980, 3),
  ('tier_2980', 2980, 4)
on conflict (tier_key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. communities 拡張: 価格ティア参照 + 作成者取り分
--    price_tier_key が null = 無料コミュニティ。is_paid / monthly_price は表示互換で残す
--    （作成フローで tier の amount と同期する想定）。
-- ----------------------------------------------------------------------------
alter table public.communities
  add column if not exists price_tier_key text
    references public.community_price_tiers(tier_key),
  add column if not exists creator_share numeric(4,3) not null default 0.850; -- 純額に対する作成者取り分

-- ----------------------------------------------------------------------------
-- 3. community_earnings: 収益台帳（1課金 = 1行）
--    gross(支払総額) → store_fee(Apple/Google) → net → platform_fee + creator_amount
-- ----------------------------------------------------------------------------
create table if not exists public.community_earnings (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid not null references public.communities(id) on delete cascade,
  creator_id     uuid not null references auth.users(id) on delete cascade,
  subscriber_id  uuid references auth.users(id) on delete set null,
  period         text not null,                 -- 集計期間 'YYYY-MM'
  currency       text not null default 'JPY',
  gross_amount   integer not null,              -- メンバー支払総額
  store_fee      integer not null default 0,    -- Apple/Google 控除
  net_amount     integer not null,              -- 純額 = gross - store_fee
  platform_fee   integer not null default 0,    -- TradeLog 取り分
  creator_amount integer not null,              -- 作成者取り分
  store          text check (store in ('apple', 'google')),
  store_txn_id   text unique,                   -- IAP取引ID（二重計上防止の冪等キー）
  payout_id      uuid,                          -- creator_payouts.id（支払い済みなら）
  status         text not null default 'pending'
                 check (status in ('pending', 'paid', 'reversed')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_community_earnings_creator
  on public.community_earnings (creator_id, period);
create index if not exists idx_community_earnings_community
  on public.community_earnings (community_id);

-- ----------------------------------------------------------------------------
-- 4. creator_payouts: 月次ペイアウト（作成者への振込1回 = 1行）
-- ----------------------------------------------------------------------------
create table if not exists public.creator_payouts (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references auth.users(id) on delete cascade,
  period      text not null,                    -- 'YYYY-MM'
  amount      integer not null,
  currency    text not null default 'JPY',
  method      text,                             -- 'bank' / 'wise' など
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'paid', 'failed')),
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (creator_id, period)
);

-- ----------------------------------------------------------------------------
-- 5. creator_payout_accounts: 作成者の振込先（本人確認状態）
--    生の口座番号は保存しない。実データは決済プロバイダ側に置き、ここは参照と表示用のみ。
-- ----------------------------------------------------------------------------
create table if not exists public.creator_payout_accounts (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  status               text not null default 'unverified'
                       check (status in ('unverified', 'pending', 'verified', 'rejected')),
  method               text,                    -- 'bank' など
  provider_account_ref text,                    -- 決済プロバイダ側の参照ID
  display_name         text,                    -- 表示用（例: 銀行名・下4桁）
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================================================================
-- RLS
-- ============================================================================

-- 価格ティア: 全員(認証済み)が参照可。書き込みはサーバのみ。
alter table public.community_price_tiers enable row level security;
drop policy if exists "price_tiers_read_all" on public.community_price_tiers;
create policy "price_tiers_read_all"
  on public.community_price_tiers for select using (true);

-- 収益台帳: 作成者は自分の分のみ参照。書き込みはサーバ(service role)のみ。
alter table public.community_earnings enable row level security;
drop policy if exists "earnings_read_own" on public.community_earnings;
create policy "earnings_read_own"
  on public.community_earnings for select using (auth.uid() = creator_id);

-- ペイアウト: 作成者は自分の分のみ参照。書き込みはサーバのみ。
alter table public.creator_payouts enable row level security;
drop policy if exists "payouts_read_own" on public.creator_payouts;
create policy "payouts_read_own"
  on public.creator_payouts for select using (auth.uid() = creator_id);

-- 振込先: 本人のみ参照・作成・更新。
alter table public.creator_payout_accounts enable row level security;
drop policy if exists "payout_accounts_select_own" on public.creator_payout_accounts;
drop policy if exists "payout_accounts_insert_own" on public.creator_payout_accounts;
drop policy if exists "payout_accounts_update_own" on public.creator_payout_accounts;
create policy "payout_accounts_select_own"
  on public.creator_payout_accounts for select using (auth.uid() = user_id);
create policy "payout_accounts_insert_own"
  on public.creator_payout_accounts for insert with check (auth.uid() = user_id);
create policy "payout_accounts_update_own"
  on public.creator_payout_accounts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
