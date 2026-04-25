-- TradeLog: profiles に nationality / is_verified カラム追加 + RLS 整備
--
-- 変更点:
--   1. profiles.nationality (text, ISO 3166-1 alpha-2 国コード, 例: JP)
--   2. profiles.is_verified (boolean, 本人確認バッジ用, デフォルト false)
--   3. profiles の RLS: 全員SELECT可（公開プロフィール）、本人のみUPDATE可
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. nationality カラム追加
-- ============================================================================

alter table public.profiles
  add column if not exists nationality text;

comment on column public.profiles.nationality is 'ISO 3166-1 alpha-2 国コード (例: JP, US, GB)';

-- ============================================================================
-- 2. is_verified カラム追加
-- ============================================================================

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

comment on column public.profiles.is_verified is '本人確認済みフラグ（バッジ表示用）';

-- ============================================================================
-- 3. profiles RLS 整備
-- ============================================================================

alter table public.profiles enable row level security;

-- 既存ポリシーがあれば一度クリア
drop policy if exists "profiles_select_all"   on public.profiles;
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_insert_own"   on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;

-- 全員のプロフィールはSELECT可（公開情報）
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- INSERTは自分のidしか許可しない（auto-create triggerでも安全）
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- UPDATEは自分のみ
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
