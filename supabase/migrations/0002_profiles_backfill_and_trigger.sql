-- TradeLog: profiles バックフィル + 新規登録時の自動プロフィール作成トリガー
--
-- 背景:
--   trades.user_id は public.profiles(id) を参照する外部キー制約を持つ。
--   そのため、auth.users にユーザーがいても profiles に行がないと取引を保存できない。
--
-- このマイグレーションは idempotent（何度実行しても安全）

-- ============================================================================
-- A. 既存 auth.users 全員分の profiles 行をバックフィル
-- ============================================================================

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- B. 新規ユーザー登録時に自動で profiles 行を作るトリガー
-- ============================================================================

-- B-1. トリガー関数
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users への INSERT に応じて public.profiles に対応行を作成する';

-- B-2. トリガー（冪等性のため既存があれば削除してから作成）
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
