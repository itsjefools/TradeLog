-- プロフィールの外部リンクを URL(website) + YouTube の2つに。
-- youtube: YouTube チャンネルURL もしくは @ハンドル。
-- 旧 twitter_handle カラムは残すが、アプリ UI からは使用しない（後方互換のため drop しない）。
alter table public.profiles
  add column if not exists youtube text;
