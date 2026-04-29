-- TradeLog: 通報 (reports) + ブロック (blocks)
--
-- App Store / Google Play の UGC アプリ審査で必須:
--   - ユーザーが他のユーザー / 投稿 / コメントを通報できる
--   - ユーザーが他のユーザーをブロックできる（フィード・コメントから非表示）
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. reports（通報）
-- ============================================================================

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  target_type   text not null check (target_type in ('post', 'comment', 'user')),
  target_id     uuid not null,
  reason        text not null,
  details       text,
  status        text not null default 'pending'
                check (status in ('pending', 'resolved', 'dismissed')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists reports_reporter_idx
  on public.reports (reporter_id, created_at desc);
create index if not exists reports_target_idx
  on public.reports (target_type, target_id);
create index if not exists reports_pending_idx
  on public.reports (status, created_at desc) where status = 'pending';

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own"  on public.reports;

-- 自分の通報のみ insert / select 可（admin は service_role で見る）
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = reporter_id);

comment on table public.reports is
  'ユーザーからの通報。admin が service_role で確認・対応する';

-- ============================================================================
-- 2. blocks（ブロック）
-- ============================================================================

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocker_idx
  on public.blocks (blocker_id, created_at desc);
create index if not exists blocks_blocked_idx
  on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own"  on public.blocks;
drop policy if exists "blocks_insert_own"  on public.blocks;
drop policy if exists "blocks_delete_own"  on public.blocks;

-- 自分のブロックリストのみ操作可能
create policy "blocks_select_own"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks_insert_own"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

comment on table public.blocks is
  'ユーザー間ブロック。クライアント側でフィード・コメントをフィルタする';

-- ============================================================================
-- 3. ブロック時の副作用: フォロー解除 (任意トリガー)
-- ============================================================================

create or replace function public.unfollow_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ブロック時に双方向のフォローを解除
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists trg_unfollow_on_block on public.blocks;
create trigger trg_unfollow_on_block
  after insert on public.blocks
  for each row execute function public.unfollow_on_block();
