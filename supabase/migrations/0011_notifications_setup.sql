-- TradeLog: notifications RLS + 自動生成トリガー
--
-- 設計:
--   likes / comments / follows の INSERT で notifications を自動生成
--   自分自身へのアクションは通知しない (actor_id = user_id を除外)
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. notifications RLS
-- ============================================================================

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own"  on public.notifications;
drop policy if exists "notifications_insert_any"  on public.notifications;
drop policy if exists "notifications_update_own"  on public.notifications;
drop policy if exists "notifications_delete_own"  on public.notifications;

-- 自分宛の通知のみ閲覧可
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- INSERT は trigger (security definer) からのみ呼ばれる前提で広めに許可
-- （RLSバイパスのために security definer 関数を使うので、INSERT policy 自体は許可しない）
-- ただし client から直接 insert される可能性に備えて、自分が actor の通知のみ insert 許可
create policy "notifications_insert_any"
  on public.notifications for insert
  with check (auth.uid() = actor_id);

-- 自分宛の通知を既読化（update）できる
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 自分宛の通知を削除できる
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. likes → notification 生成トリガー
-- ============================================================================

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  -- 自分の投稿に自分でいいね → 通知しない
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_owner, new.user_id, 'like', new.post_id);
  return new;
end;
$$;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- ============================================================================
-- 3. comments → notification 生成トリガー
-- ============================================================================

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_owner, new.user_id, 'comment', new.post_id);
  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ============================================================================
-- 4. follows → notification 生成トリガー
-- ============================================================================

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 自己フォロー禁止（DB制約あり）だが念のため
  if new.follower_id = new.following_id then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();
