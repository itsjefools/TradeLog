-- TradeLog: プロフィール上部の横長バナー画像
-- profiles.banner_url: ユーザーが選んだバナー画像のURL(Supabase Storage)。null可。
-- このマイグレーションは idempotent

alter table public.profiles
  add column if not exists banner_url text;
