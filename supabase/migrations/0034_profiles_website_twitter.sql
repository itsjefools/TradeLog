-- profiles に website / twitter_handle / updated_at を追加
-- プロフィール編集画面で外部リンク (Web サイト / X アカウント) を編集できるようにする

alter table public.profiles
  add column if not exists website text;

alter table public.profiles
  add column if not exists twitter_handle text;

alter table public.profiles
  add column if not exists updated_at timestamptz default now();

comment on column public.profiles.website is
  'ユーザーが任意で公開する Web サイト URL';

comment on column public.profiles.twitter_handle is
  'ユーザーが任意で公開する X (Twitter) ハンドル。@ は含めない。';

comment on column public.profiles.updated_at is
  'プロフィール最終更新日時。アプリ側で updateProfile 呼び出し時に now() で更新。';

-- updated_at を更新する trigger (idempotent)
create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.profiles_set_updated_at();
