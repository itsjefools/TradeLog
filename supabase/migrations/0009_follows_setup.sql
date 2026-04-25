-- TradeLog: follows テーブル整備 + RLS
--
-- スキーマ:
--   follower_id   - フォローするユーザー (= 自分)
--   following_id  - フォローされるユーザー (= 相手)
--   primary key (follower_id, following_id)
--   自己フォロー禁止 (check 制約)
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. follows テーブル（既存ならスキップ）
-- ============================================================================

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

comment on table public.follows is 'ユーザー間のフォロー関係';

-- ============================================================================
-- 2. インデックス
-- ============================================================================

-- 自分がフォローしている人を新着順に取る
create index if not exists follows_follower_created_idx
  on public.follows (follower_id, created_at desc);

-- 自分のフォロワーを新着順に取る
create index if not exists follows_following_created_idx
  on public.follows (following_id, created_at desc);

-- ============================================================================
-- 3. RLS
-- ============================================================================

alter table public.follows enable row level security;

drop policy if exists "follows_select_all"  on public.follows;
drop policy if exists "follows_insert_own"  on public.follows;
drop policy if exists "follows_delete_own"  on public.follows;
drop policy if exists "follows_update_own"  on public.follows;

-- 全員が誰のフォロー関係でも閲覧可（公開情報）
create policy "follows_select_all"
  on public.follows for select
  using (true);

-- 自分の follower_id でしか insert できない
create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

-- 自分の follower_id 行しか delete できない
create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);
