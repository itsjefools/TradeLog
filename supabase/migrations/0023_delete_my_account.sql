-- TradeLog: アカウント削除 RPC
--
-- Apple App Store Guideline 5.1.1(v): アプリ内からアカウント削除できることが必須
--
-- 削除対象:
--   - public.profiles (CASCADE で trades, posts, comments, likes, follows, etc 全て削除)
--   - auth.users (再登録できるように完全に消す)
--
-- このマイグレーションは idempotent

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- profiles を消すと FK cascade で関連データも全削除される
  delete from public.profiles where id = v_user_id;

  -- auth ユーザー本体も削除（同じメールで再登録可能にする）
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'ログイン中ユーザーのアカウントと全データを完全削除する。Apple App Store Guideline 5.1.1(v) 対応';
