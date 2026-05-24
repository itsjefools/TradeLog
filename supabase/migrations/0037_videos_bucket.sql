-- TradeLog: 動画用ストレージバケット 'videos'
--
-- 用途: フィード投稿の動画。lib/upload-media.ts の POST_VIDEO_BUCKET = 'videos' に対応。
-- これが無いと動画投稿時に「Bucket not found」になる（バグ#7）。
-- このマイグレーションは idempotent。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  52428800, -- 50 MB
  array[
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ポリシー（再作成）: 自分のフォルダ配下のみ追加/削除、閲覧は公開
drop policy if exists "videos_insert_own" on storage.objects;
drop policy if exists "videos_select_all" on storage.objects;
drop policy if exists "videos_delete_own" on storage.objects;

create policy "videos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "videos_select_all"
  on storage.objects for select
  to public
  using (bucket_id = 'videos');

create policy "videos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
