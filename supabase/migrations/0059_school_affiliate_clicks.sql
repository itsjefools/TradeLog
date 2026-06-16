-- 0059: 外部アフィリエイトリンクのクリック計測テーブル。
--  lib/affiliate.ts の openAffiliate() がベストエフォートで記録する。
--  どのリンクがクリックされたかを把握し、収益最適化(配置・訴求の改善)に使う。
--  ユーザーは自分のクリックを insert できるが select はできない（集計はダッシュボード/service role）。
-- idempotent

create table if not exists public.school_affiliate_clicks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  url        text not null,
  kind       text not null default 'other',  -- 'book' | 'broker' | 'tool' | 'other'
  item_id    text,                           -- 書籍ID等（任意）
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_clicks_created_at
  on public.school_affiliate_clicks (created_at desc);
create index if not exists idx_affiliate_clicks_kind
  on public.school_affiliate_clicks (kind);

alter table public.school_affiliate_clicks enable row level security;

-- insert のみ許可。user_id は本人 or null(匿名)のみ。閲覧ポリシーは作らない=ユーザーは読めない。
drop policy if exists "insert own affiliate click" on public.school_affiliate_clicks;
create policy "insert own affiliate click"
  on public.school_affiliate_clicks
  for insert
  to authenticated, anon
  with check (user_id is null or user_id = auth.uid());

grant insert on public.school_affiliate_clicks to authenticated, anon;
