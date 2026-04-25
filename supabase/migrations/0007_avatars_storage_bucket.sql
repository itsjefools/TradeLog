-- TradeLog: avatars 用 Supabase Storage バケットを作成 + RLS
--
-- 目的: ユーザーがプロフィール画像をアップロードできるようにする
-- 構成: バケット名 'avatars'、公開バケット（誰でもread可）、
--       ユーザーは自分のフォルダ {user_id}/... のみ書き込み可

-- ============================================================================
-- 1. avatars バケットを作成（既存の場合は何もしない）
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ============================================================================
-- 2. RLS ポリシー（storage.objects）
-- ============================================================================

-- 既存ポリシーがあればクリア
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_insert"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;

-- 全員 read 可
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 自分のフォルダ {auth.uid()}/... にだけ insert 可
create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のフォルダの update のみ可
create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のフォルダの delete のみ可
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
