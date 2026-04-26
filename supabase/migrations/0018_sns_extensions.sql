-- TradeLog: SNS拡張機能
--   1. コメント返信（comments.parent_id）
--   2. メンション（@user）通知トリガー
--   3. ブックマーク（bookmarks テーブル）
--   4. リポスト（reposts テーブル）
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. コメント返信用 parent_id
-- ============================================================================

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_idx
  on public.comments (parent_id, created_at)
  where parent_id is not null;

-- ============================================================================
-- 2. メンション通知トリガー
-- ============================================================================

-- 文字列から @username を抽出（半角英数字 + アンダースコア）
create or replace function public.extract_mentions(text_content text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(distinct lower(m[1]))
      filter (where m[1] is not null and m[1] <> ''),
    array[]::text[]
  )
  from regexp_matches(coalesce(text_content, ''), '@([A-Za-z0-9_]+)', 'g') as t(m)
$$;

-- コメントに記載されたメンションから通知を作成
create or replace function public.notify_mentions_in_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mentions text[];
  uname text;
  target_id uuid;
begin
  mentions := public.extract_mentions(new.content);
  foreach uname in array mentions loop
    select id into target_id
      from public.profiles
     where lower(username) = uname
     limit 1;
    if target_id is not null and target_id <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, post_id)
      values (target_id, new.user_id, 'mention', new.post_id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_mentions_in_comment();

-- メッセージのメンション（DM内で @user を入れたら相手に追加通知）
-- ただしDMは元々相手宛なので二重通知になりがち。シンプルに DM では通知しない。

-- ============================================================================
-- 3. ブックマーク
-- ============================================================================

create table if not exists public.bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_select_own" on public.bookmarks;
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
drop policy if exists "bookmarks_delete_own" on public.bookmarks;

-- 自分のブックマークのみ閲覧可
create policy "bookmarks_select_own"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 4. リポスト
-- ============================================================================

create table if not exists public.reposts (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists reposts_user_created_idx
  on public.reposts (user_id, created_at desc);
create index if not exists reposts_post_idx
  on public.reposts (post_id);

alter table public.reposts enable row level security;

drop policy if exists "reposts_select_all" on public.reposts;
drop policy if exists "reposts_insert_own" on public.reposts;
drop policy if exists "reposts_delete_own" on public.reposts;

-- リポストは公開情報（誰がリポストしたか見える）
create policy "reposts_select_all"
  on public.reposts for select
  using (true);

create policy "reposts_insert_own"
  on public.reposts for insert
  with check (auth.uid() = user_id);

create policy "reposts_delete_own"
  on public.reposts for delete
  using (auth.uid() = user_id);

-- 投稿者本人へのリポスト通知用トリガー
create or replace function public.notify_on_repost()
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
  values (post_owner, new.user_id, 'repost', new.post_id);
  return new;
end;
$$;

drop trigger if exists reposts_notify on public.reposts;
create trigger reposts_notify
  after insert on public.reposts
  for each row execute function public.notify_on_repost();
