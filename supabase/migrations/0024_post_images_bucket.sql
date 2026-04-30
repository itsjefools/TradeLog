-- TradeLog: 投稿用画像・動画ストレージバケット
--
-- 用途: 自由投稿（post_type = 'text' / 'strategy'）の画像・動画
-- 既存の trade-images とは別バケットで管理
--
-- このマイグレーションは idempotent

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  52428800, -- 50 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ポリシー（再作成）
drop policy if exists "post_images_insert_own" on storage.objects;
drop policy if exists "post_images_select_all" on storage.objects;
drop policy if exists "post_images_delete_own" on storage.objects;

create policy "post_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_images_select_all"
  on storage.objects for select
  to public
  using (bucket_id = 'post-images');

create policy "post_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
