-- TradeLog: notifications insert 時に Expo Push API へ実配信
--
-- 設計:
--   notifications テーブルへの INSERT 後に pg_net 経由で Expo Push API を叩く
--   profiles.push_token が空ならスキップ
--   配信失敗は通知レコード作成を阻害しない（exception で握り潰す）
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. pg_net 拡張（HTTPコール用）
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- ============================================================================
-- 2. Expo Push 配信関数
-- ============================================================================

create or replace function public.send_expo_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_token      text;
  v_actor_name text;
  v_body       text;
  v_payload    jsonb;
begin
  -- 受信者の push token
  select push_token
    into v_token
    from public.profiles
   where id = new.user_id;

  if v_token is null or v_token = '' then
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

  v_payload := jsonb_build_object(
    'to',    v_token,
    'title', 'TradeLog',
    'body',  v_body,
    'sound', 'default',
    'data',  jsonb_build_object(
      'type',            new.type,
      'post_id',         new.post_id,
      'actor_id',        new.actor_id,
      'notification_id', new.id
    )
  );

  -- pg_net は async / fire-and-forget。戻り値の bigint は無視。
  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_payload,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'Accept',           'application/json',
      'Accept-Encoding',  'gzip, deflate'
    )
  );

  return new;
exception
  when others then
    -- 配信失敗は通知作成を阻害しない
    return new;
end;
$$;

-- ============================================================================
-- 3. notifications テーブルへの AFTER INSERT トリガー
-- ============================================================================

drop trigger if exists trg_send_expo_push on public.notifications;
create trigger trg_send_expo_push
  after insert on public.notifications
  for each row execute function public.send_expo_push_notification();
