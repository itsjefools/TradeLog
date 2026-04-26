-- TradeLog: DM（ダイレクトメッセージ）
--
-- シンプルな1対1メッセージ。conversations テーブルは持たず messages のみ。
-- 会話リストは get_conversations RPC で取得。
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. messages テーブル
-- ============================================================================

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_no_self check (sender_id <> receiver_id)
);

comment on table public.messages is 'ユーザー間のダイレクトメッセージ';

create index if not exists messages_sender_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_receiver_idx
  on public.messages (receiver_id, created_at desc);

create index if not exists messages_unread_idx
  on public.messages (receiver_id)
  where read_at is null;

-- ============================================================================
-- 2. RLS
-- ============================================================================

alter table public.messages enable row level security;

drop policy if exists "messages_select_own"   on public.messages;
drop policy if exists "messages_insert_own"   on public.messages;
drop policy if exists "messages_update_recv"  on public.messages;
drop policy if exists "messages_delete_own"   on public.messages;

-- 自分が送信者または受信者のメッセージだけ閲覧可
create policy "messages_select_own"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 自分が送信者の場合のみ insert 可
create policy "messages_insert_own"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- 自分が受信者の場合のみ update 可（既読化用）
create policy "messages_update_recv"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- 自分が送信者の場合のみ delete 可
create policy "messages_delete_own"
  on public.messages for delete
  using (auth.uid() = sender_id);

-- ============================================================================
-- 3. 会話リスト取得 RPC
-- ============================================================================

create or replace function public.get_conversations()
returns table (
  partner_id            uuid,
  partner_username      text,
  partner_display_name  text,
  partner_avatar_url    text,
  partner_is_verified   boolean,
  last_message_id       uuid,
  last_message_content  text,
  last_message_at       timestamptz,
  last_message_sender_id uuid,
  unread_count          bigint
)
language sql
security definer
set search_path = public
as $$
  with my_messages as (
    select * from public.messages
    where sender_id = auth.uid() or receiver_id = auth.uid()
  ),
  pairs as (
    select
      case when sender_id = auth.uid() then receiver_id else sender_id end as partner_id,
      id, content, created_at, sender_id
    from my_messages
  ),
  latest as (
    select distinct on (partner_id)
      partner_id, id, content, created_at, sender_id
    from pairs
    order by partner_id, created_at desc
  ),
  unread as (
    select sender_id as partner_id, count(*) as unread_count
    from public.messages
    where receiver_id = auth.uid() and read_at is null
    group by sender_id
  )
  select
    l.partner_id,
    p.username, p.display_name, p.avatar_url, p.is_verified,
    l.id, l.content, l.created_at, l.sender_id,
    coalesce(u.unread_count, 0)
  from latest l
  join public.profiles p on p.id = l.partner_id
  left join unread u on u.partner_id = l.partner_id
  order by l.created_at desc;
$$;

grant execute on function public.get_conversations() to authenticated;
