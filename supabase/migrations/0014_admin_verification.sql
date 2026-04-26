-- TradeLog: 認証バッジ付与の管理仕組み
--
-- バッジ付与は service_role キー（管理者）からのみ可能。
-- profiles_update_own RLS は auth.uid() = id でしか更新できないため、
-- ユーザー自身は is_verified を変更できない（RLS でブロックされる）。
--
-- 管理者が Supabase Dashboard SQL Editor から以下のように呼び出す:
--   select admin_set_verified('user@example.com', true);
--   select admin_set_verified('user@example.com', false);
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. 認証バッジ操作の管理関数
-- ============================================================================

create or replace function public.admin_set_verified(target_email text, verified boolean)
returns table (id uuid, email text, is_verified boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  -- auth.users から id を取得
  select u.id into target_id
    from auth.users u
   where u.email = target_email
   limit 1;

  if target_id is null then
    raise exception 'メールアドレス % のユーザーが見つかりません', target_email;
  end if;

  -- profiles テーブルを更新
  update public.profiles p
     set is_verified = verified
   where p.id = target_id;

  return query
    select p.id, p.email, p.is_verified
      from public.profiles p
     where p.id = target_id;
end;
$$;

comment on function public.admin_set_verified(text, boolean) is
  '管理者専用: 指定メールアドレスのユーザーに認証バッジを付与/解除（service_role キーから実行）';

-- ============================================================================
-- 2. RLS で認証バッジをユーザー自身が変更できないように補強
-- ============================================================================

-- 既存の profiles_update_own ポリシーを更新して is_verified を変更させない
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_verified is not distinct from (
      select p.is_verified from public.profiles p where p.id = auth.uid()
    )
  );

-- ============================================================================
-- 3. ユースケース例（コメント）
-- ============================================================================

-- 認証バッジを付ける:
--   select * from admin_set_verified('user@example.com', true);
--
-- 認証バッジを外す:
--   select * from admin_set_verified('user@example.com', false);
--
-- 全認証ユーザー一覧:
--   select id, email, display_name from profiles where is_verified = true;
