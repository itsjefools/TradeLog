-- TradeLog: 共有取引(is_shared=true)に対応する posts を自動作成する仕組み
--
-- 設計:
--   trades.is_shared = true になったタイミングで public.posts に1件 INSERT
--   trades.is_shared = false に戻したら post を削除
--   既存の共有取引に対しては一括バックフィル
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. posts テーブルの likes_count / comments_count が NULL 許容の場合
--    デフォルト 0 を保証
-- ============================================================================

alter table public.posts
  alter column likes_count set default 0;

alter table public.posts
  alter column comments_count set default 0;

update public.posts set likes_count = 0 where likes_count is null;
update public.posts set comments_count = 0 where comments_count is null;

alter table public.posts
  alter column likes_count set not null;

alter table public.posts
  alter column comments_count set not null;

-- ============================================================================
-- 2. trades.is_shared 変更時に posts を同期するトリガー関数
-- ============================================================================

create or replace function public.sync_post_for_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- INSERT または UPDATE で is_shared が true になった
  if (tg_op = 'INSERT' and new.is_shared = true)
     or (tg_op = 'UPDATE' and new.is_shared = true and (old.is_shared is distinct from true)) then
    insert into public.posts (user_id, trade_id, post_type, content)
    values (new.user_id, new.id, 'trade_result', coalesce(new.memo, ''))
    on conflict do nothing;
  end if;

  -- UPDATE で is_shared が false になった: 対応 post を削除
  if tg_op = 'UPDATE' and new.is_shared = false and old.is_shared = true then
    delete from public.posts where trade_id = new.id;
  end if;

  return new;
end;
$$;

comment on function public.sync_post_for_trade() is
  'trades.is_shared に応じて public.posts を同期する';

drop trigger if exists trades_sync_post on public.trades;
create trigger trades_sync_post
  after insert or update of is_shared on public.trades
  for each row execute function public.sync_post_for_trade();

-- ============================================================================
-- 3. trades 削除時に対応 post も削除（FK の ON DELETE で対応されてない場合の保険）
-- ============================================================================

-- posts.trade_id が trades.id に対する FK で ON DELETE CASCADE になっていれば
-- 自動削除される。なっていない場合は以下のトリガーで明示的に削除。
-- 既存FK状態が不明なため、明示削除トリガーを追加（重複削除でも安全）

create or replace function public.delete_posts_for_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.posts where trade_id = old.id;
  return old;
end;
$$;

drop trigger if exists trades_delete_post on public.trades;
create trigger trades_delete_post
  before delete on public.trades
  for each row execute function public.delete_posts_for_trade();

-- ============================================================================
-- 4. 既存の共有取引(is_shared=true)に対して posts をバックフィル
-- ============================================================================

insert into public.posts (user_id, trade_id, post_type, content, created_at)
select
  t.user_id,
  t.id,
  'trade_result',
  coalesce(t.memo, ''),
  t.created_at
from public.trades t
where t.is_shared = true
  and not exists (select 1 from public.posts p where p.trade_id = t.id);

-- ============================================================================
-- 5. likes / comments のカウント整合性
--    既存の likes / comments がもしあれば likes_count / comments_count を再計算
-- ============================================================================

update public.posts p set likes_count = sub.cnt
from (
  select post_id, count(*) as cnt
  from public.likes
  group by post_id
) sub
where p.id = sub.post_id;

update public.posts p set comments_count = sub.cnt
from (
  select post_id, count(*) as cnt
  from public.comments
  group by post_id
) sub
where p.id = sub.post_id;

-- ============================================================================
-- 6. likes / comments の trigger でカウント自動更新
-- ============================================================================

create or replace function public.posts_inc_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.posts_dec_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists likes_inc on public.likes;
create trigger likes_inc
  after insert on public.likes
  for each row execute function public.posts_inc_likes();

drop trigger if exists likes_dec on public.likes;
create trigger likes_dec
  after delete on public.likes
  for each row execute function public.posts_dec_likes();

create or replace function public.posts_inc_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.posts_dec_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists comments_inc on public.comments;
create trigger comments_inc
  after insert on public.comments
  for each row execute function public.posts_inc_comments();

drop trigger if exists comments_dec on public.comments;
create trigger comments_dec
  after delete on public.comments
  for each row execute function public.posts_dec_comments();
