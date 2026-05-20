-- TradeLog: user_push_tokens テーブル + 配信トリガー更新
--
-- 設計:
--   従来 profiles.push_token (1ユーザー=1トークン) では複数端末で
--   最後にログインした端末しか通知を受け取れなかった。
--   user_push_tokens 別テーブル化で 1ユーザー N トークン (複数端末) 対応。
--   配信トリガー (send_expo_push_notification) は全トークンへ並列配信する。
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. user_push_tokens テーブル
-- ============================================================================

create table if not exists public.user_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_user_push_tokens_user_id
  on public.user_push_tokens (user_id);

-- ============================================================================
-- 2. RLS
-- ============================================================================

alter table public.user_push_tokens enable row level security;

drop policy if exists "user_push_tokens_select_own" on public.user_push_tokens;
drop policy if exists "user_push_tokens_insert_own" on public.user_push_tokens;
drop policy if exists "user_push_tokens_update_own" on public.user_push_tokens;
drop policy if exists "user_push_tokens_delete_own" on public.user_push_tokens;

create policy "user_push_tokens_select_own"
  on public.user_push_tokens for select
  using (auth.uid() = user_id);

create policy "user_push_tokens_insert_own"
  on public.user_push_tokens for insert
  with check (auth.uid() = user_id);

create policy "user_push_tokens_update_own"
  on public.user_push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_push_tokens_delete_own"
  on public.user_push_tokens for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. 配信トリガー: 全トークンへ並列配信するよう更新
-- ============================================================================

create or replace function public.send_expo_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_actor_name text;
  v_body       text;
  v_tokens     text[];
  v_token      text;
  v_payload    jsonb;
  v_channel_id text;
begin
  -- 受信者の全 push token (複数端末対応)
  select coalesce(array_agg(token), '{}')
    into v_tokens
    from public.user_push_tokens
   where user_id = new.user_id;

  if v_tokens is null or array_length(v_tokens, 1) is null then
    return new;
  end if;

  -- アクター名（display_name → username → email先頭 → fallback）
  select coalesce(
           nullif(trim(display_name), ''),
           nullif(trim(username), ''),
           split_part(email, '@', 1),
           'ユーザー'
         )
    into v_actor_name
    from public.profiles
   where id = new.actor_id;

  if v_actor_name is null then
    v_actor_name := 'ユーザー';
  end if;

  -- in-app の文言と一致させる
  v_body := case new.type
    when 'like'    then v_actor_name || ' さんがあなたの投稿にいいねしました'
    when 'comment' then v_actor_name || ' さんがあなたの投稿にコメントしました'
    when 'follow'  then v_actor_name || ' さんがあなたをフォローしました'
    when 'mention' then v_actor_name || ' さんがあなたをメンションしました'
    when 'repost'  then v_actor_name || ' さんがあなたの投稿をリポストしました'
    else                v_actor_name || ' さんからの通知'
  end;

  -- Android 通知チャンネル振り分け
  v_channel_id := case new.type
    when 'like'    then 'social'
    when 'comment' then 'social'
    when 'follow'  then 'social'
    when 'mention' then 'social'
    when 'repost'  then 'social'
    else                'default'
  end;

  -- 各トークンに配信
  foreach v_token in array v_tokens loop
    v_payload := jsonb_build_object(
      'to',        v_token,
      'title',     'TradeLog',
      'body',      v_body,
      'sound',     'default',
      'channelId', v_channel_id,
      'data',      jsonb_build_object(
        'type',            new.type,
        'post_id',         new.post_id,
        'actor_id',        new.actor_id,
        'notification_id', new.id
      )
    );

    begin
      perform net.http_post(
        url     := 'https://exp.host/--/api/v2/push/send',
        body    := v_payload,
        headers := jsonb_build_object(
          'Content-Type',     'application/json',
          'Accept',           'application/json',
          'Accept-Encoding',  'gzip, deflate'
        )
      );
    exception
      when others then
        -- 個別トークンの配信失敗は他に影響しない
        null;
    end;
  end loop;

  return new;
exception
  when others then
    -- 配信失敗は通知作成を阻害しない
    return new;
end;
$$;

-- トリガー本体は 0020 で作成済み。関数の置換だけで反映される
