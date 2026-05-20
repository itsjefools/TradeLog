-- TradeLog: スクール — コミュニティ機能 + おすすめ投稿
--
-- 設計:
--   - communities: ユーザー作成のコミュニティ (グループ)。無料/有料 (App Store 課金) を選択可
--   - community_members: 参加者 (owner / moderator / member)
--   - community_posts: コミュニティ内のタイムライン投稿
--   - user_recommendations: 特権ユーザーが投稿するおすすめ (本/動画/ツール/ブローカー)
--   - profiles.total_trades: 有料コミュニティ作成条件の判定に使用 (取引10件以上)
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. profiles に total_trades カラム追加
-- ============================================================================
-- is_verified, is_premium は既存 (0005, 過去マイグレーション)。total_trades は新規。

alter table public.profiles
  add column if not exists total_trades integer not null default 0;

-- 既存ユーザーの total_trades をシード
update public.profiles p
   set total_trades = coalesce(t.cnt, 0)
  from (
    select user_id, count(*)::int as cnt
      from public.trades
     group by user_id
  ) t
 where p.id = t.user_id
   and p.total_trades = 0;

-- trades insert/delete 時に total_trades を自動更新
create or replace function public.bump_total_trades()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles
       set total_trades = total_trades + 1
     where id = new.user_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles
       set total_trades = greatest(0, total_trades - 1)
     where id = old.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trades_bump_total on public.trades;
create trigger trades_bump_total
  after insert or delete on public.trades
  for each row execute function public.bump_total_trades();

-- ============================================================================
-- 2. communities
-- ============================================================================

create table if not exists public.communities (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  description       text,
  cover_image_url   text,
  category          text default 'general'
                    check (category in ('general', 'strategy', 'analysis', 'beginner', 'advanced')),
  is_paid           boolean default false,
  monthly_price     integer default 0,
  iap_product_id    text,
  member_count      integer default 0,
  is_active         boolean default true,
  owner_verified    boolean default false,
  owner_is_premium  boolean default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_communities_owner_id
  on public.communities (owner_id);
create index if not exists idx_communities_active
  on public.communities (is_active, member_count desc);

-- ============================================================================
-- 3. community_members
-- ============================================================================

create table if not exists public.community_members (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at     timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists idx_community_members_user
  on public.community_members (user_id);
create index if not exists idx_community_members_community
  on public.community_members (community_id);

-- ============================================================================
-- 4. community_posts
-- ============================================================================

create table if not exists public.community_posts (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  image_urls    text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_community_posts_community
  on public.community_posts (community_id, created_at desc);

-- ============================================================================
-- 5. user_recommendations
-- ============================================================================

create table if not exists public.user_recommendations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('book', 'video', 'tool', 'broker')),
  title        text not null,
  description  text,
  url          text,
  image_url    text,
  is_approved  boolean default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_user_recommendations_approved
  on public.user_recommendations (is_approved, created_at desc);

-- ============================================================================
-- 6. RLS: communities
-- ============================================================================

alter table public.communities enable row level security;

drop policy if exists "communities_read_active"      on public.communities;
drop policy if exists "communities_insert_own"       on public.communities;
drop policy if exists "communities_update_own"       on public.communities;
drop policy if exists "communities_delete_own"       on public.communities;

create policy "communities_read_active"
  on public.communities for select using (is_active = true);
create policy "communities_insert_own"
  on public.communities for insert with check (auth.uid() = owner_id);
create policy "communities_update_own"
  on public.communities for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "communities_delete_own"
  on public.communities for delete using (auth.uid() = owner_id);

-- ============================================================================
-- 7. RLS: community_members
-- ============================================================================

alter table public.community_members enable row level security;

drop policy if exists "community_members_read_all"      on public.community_members;
drop policy if exists "community_members_insert_self"   on public.community_members;
drop policy if exists "community_members_delete_self"   on public.community_members;
drop policy if exists "community_members_owner_manage"  on public.community_members;

create policy "community_members_read_all"
  on public.community_members for select using (true);

create policy "community_members_insert_self"
  on public.community_members for insert with check (auth.uid() = user_id);

create policy "community_members_delete_self"
  on public.community_members for delete using (auth.uid() = user_id);

-- オーナーは自分のコミュニティのメンバーを管理 (kick 等)
create policy "community_members_owner_manage"
  on public.community_members for delete
  using (
    community_id in (
      select id from public.communities where owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. RLS: community_posts
-- ============================================================================

alter table public.community_posts enable row level security;

drop policy if exists "community_posts_select_member" on public.community_posts;
drop policy if exists "community_posts_insert_member" on public.community_posts;
drop policy if exists "community_posts_update_own"    on public.community_posts;
drop policy if exists "community_posts_delete_own"    on public.community_posts;

create policy "community_posts_select_member"
  on public.community_posts for select
  using (
    community_id in (
      select community_id from public.community_members where user_id = auth.uid()
    )
  );

create policy "community_posts_insert_member"
  on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and community_id in (
      select community_id from public.community_members where user_id = auth.uid()
    )
  );

create policy "community_posts_update_own"
  on public.community_posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "community_posts_delete_own"
  on public.community_posts for delete using (auth.uid() = user_id);

-- ============================================================================
-- 9. RLS: user_recommendations
-- ============================================================================

alter table public.user_recommendations enable row level security;

drop policy if exists "user_recs_read_approved"    on public.user_recommendations;
drop policy if exists "user_recs_insert_eligible"  on public.user_recommendations;
drop policy if exists "user_recs_delete_own"       on public.user_recommendations;

create policy "user_recs_read_approved"
  on public.user_recommendations for select using (is_approved = true);

-- 投稿条件: 本人確認済み + Premium + 取引10件以上
create policy "user_recs_insert_eligible"
  on public.user_recommendations for insert with check (
    auth.uid() = user_id
    and auth.uid() in (
      select id from public.profiles
       where is_verified = true
         and is_premium  = true
         and total_trades >= 10
    )
  );

create policy "user_recs_delete_own"
  on public.user_recommendations for delete using (auth.uid() = user_id);

-- ============================================================================
-- 10. member_count を自動同期するトリガー
-- ============================================================================

create or replace function public.update_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.communities
       set member_count = member_count + 1
     where id = new.community_id;
  elsif (tg_op = 'DELETE') then
    update public.communities
       set member_count = greatest(0, member_count - 1)
     where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_community_member_count on public.community_members;
create trigger trg_community_member_count
  after insert or delete on public.community_members
  for each row execute function public.update_community_member_count();
