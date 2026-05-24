-- プロフィールの装着バッジ（ショーケース）と表示ON/OFF
-- showcase_badges: ユーザーが選んで表示するバッジ id（最大3件・アプリ側で制限）
-- show_badges:     プロフィールにバッジを表示するか
alter table public.profiles
  add column if not exists showcase_badges text[] not null default '{}',
  add column if not exists show_badges boolean not null default true;
