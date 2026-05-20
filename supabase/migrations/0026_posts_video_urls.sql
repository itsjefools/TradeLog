-- posts.video_urls: フィード投稿に添付された動画の URL 配列
-- 画像と動画を分けて保持することで、フィード側で扱いを切り替えやすくする
-- 動画は専用バケット (videos) に保存される

alter table public.posts
  add column if not exists video_urls text[];

comment on column public.posts.video_urls is
  'フィード投稿に添付された動画のパブリック URL 配列 (Supabase Storage の videos バケット)';
