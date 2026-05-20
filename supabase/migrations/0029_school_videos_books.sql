-- TradeLog: スクール — 動画 + 本 (アフィリエイト)
--
-- 設計:
--   - school_videos: YouTube 埋め込み動画 (videoId + 4言語タイトル/説明)
--   - school_books:  書籍紹介 + 4ロケール別アフィリエイトリンク
--   - book_reviews:  ユーザーレビュー (5段階評価 + コメント)
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. school_videos
-- ============================================================================

create table if not exists public.school_videos (
  id                uuid primary key default gen_random_uuid(),
  title_ja          text not null,
  title_en          text,
  title_pt          text,
  title_es          text,
  description_ja    text,
  description_en    text,
  description_pt    text,
  description_es    text,
  youtube_video_id  text not null,
  thumbnail_url     text,
  category          text default 'basics'
                    check (category in ('basics', 'technical', 'strategy', 'psychology', 'news')),
  difficulty        text default 'beginner'
                    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_seconds  integer,
  is_featured       boolean default false,
  is_free           boolean default true,
  sort_order        integer default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_school_videos_sort_order
  on public.school_videos (sort_order);
create index if not exists idx_school_videos_category
  on public.school_videos (category);

-- ============================================================================
-- 2. school_books
-- ============================================================================

create table if not exists public.school_books (
  id                 uuid primary key default gen_random_uuid(),
  title_ja           text not null,
  title_en           text,
  title_pt           text,
  title_es           text,
  author             text not null,
  description_ja     text,
  description_en     text,
  description_pt     text,
  description_es     text,
  cover_image_url    text,
  affiliate_url_ja   text,
  affiliate_url_en   text,
  affiliate_url_pt   text,
  affiliate_url_es   text,
  category           text default 'basics'
                     check (category in ('basics', 'technical', 'strategy', 'psychology', 'mindset')),
  difficulty         text default 'beginner'
                     check (difficulty in ('beginner', 'intermediate', 'advanced')),
  rating             numeric(2,1) default 0,
  is_featured        boolean default false,
  sort_order         integer default 0,
  created_at         timestamptz not null default now()
);

create index if not exists idx_school_books_sort_order
  on public.school_books (sort_order);
create index if not exists idx_school_books_category
  on public.school_books (category);

-- ============================================================================
-- 3. book_reviews
-- ============================================================================

create table if not exists public.book_reviews (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references public.school_books(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  rating      integer check (rating >= 1 and rating <= 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (book_id, user_id)
);

create index if not exists idx_book_reviews_book_id
  on public.book_reviews (book_id);

-- ============================================================================
-- 4. RLS
-- ============================================================================

alter table public.school_videos enable row level security;
alter table public.school_books  enable row level security;
alter table public.book_reviews  enable row level security;

drop policy if exists "school_videos_read_all" on public.school_videos;
create policy "school_videos_read_all"
  on public.school_videos for select using (true);

drop policy if exists "school_books_read_all" on public.school_books;
create policy "school_books_read_all"
  on public.school_books for select using (true);

drop policy if exists "book_reviews_read_all"      on public.book_reviews;
drop policy if exists "book_reviews_insert_own"    on public.book_reviews;
drop policy if exists "book_reviews_update_own"    on public.book_reviews;
drop policy if exists "book_reviews_delete_own"    on public.book_reviews;

create policy "book_reviews_read_all"
  on public.book_reviews for select using (true);
create policy "book_reviews_insert_own"
  on public.book_reviews for insert with check (auth.uid() = user_id);
create policy "book_reviews_update_own"
  on public.book_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "book_reviews_delete_own"
  on public.book_reviews for delete using (auth.uid() = user_id);

-- ============================================================================
-- 5. 初期データ: 動画 (サンプル youtube_video_id は後で差し替え)
-- ============================================================================

insert into public.school_videos
  (title_ja, title_en, title_pt, title_es, youtube_video_id, category, difficulty, duration_seconds, is_featured, is_free, sort_order)
select
  'FX初心者が最初に知るべきこと', 'What FX Beginners Need to Know',
  'O que iniciantes em Forex precisam saber', 'Lo que los principiantes deben saber',
  'SAMPLE_VIDEO_ID_1', 'basics', 'beginner', 600, true, true, 1
where not exists (select 1 from public.school_videos where youtube_video_id = 'SAMPLE_VIDEO_ID_1');

insert into public.school_videos
  (title_ja, title_en, title_pt, title_es, youtube_video_id, category, difficulty, duration_seconds, is_featured, is_free, sort_order)
select
  'ローソク足の基本パターン', 'Basic Candlestick Patterns',
  'Padrões Básicos de Candlestick', 'Patrones Básicos de Velas',
  'SAMPLE_VIDEO_ID_2', 'technical', 'beginner', 900, false, true, 2
where not exists (select 1 from public.school_videos where youtube_video_id = 'SAMPLE_VIDEO_ID_2');

insert into public.school_videos
  (title_ja, title_en, title_pt, title_es, youtube_video_id, category, difficulty, duration_seconds, is_featured, is_free, sort_order)
select
  '移動平均線の使い方', 'How to Use Moving Averages',
  'Como Usar Médias Móveis', 'Cómo Usar Medias Móviles',
  'SAMPLE_VIDEO_ID_3', 'technical', 'intermediate', 720, false, false, 3
where not exists (select 1 from public.school_videos where youtube_video_id = 'SAMPLE_VIDEO_ID_3');

-- ============================================================================
-- 6. 初期データ: 本 (アフィリエイトURL は後で差し替え)
-- ============================================================================

insert into public.school_books
  (title_ja, title_en, title_pt, title_es, author,
   description_ja, description_en,
   affiliate_url_ja, affiliate_url_en, category, difficulty, is_featured, sort_order)
select
  'ゾーン — 相場心理学入門', 'Trading in the Zone',
  'Trading in the Zone', 'Trading en la Zona',
  'マーク・ダグラス',
  'トレードで成功するための心理的アプローチを解説。プロトレーダー必読の一冊。',
  'A masterpiece on trading psychology by Mark Douglas. A must-read for serious traders.',
  'https://www.amazon.co.jp/dp/4775970844?tag=YOUR_AFFILIATE_TAG',
  'https://www.amazon.com/dp/0735201447?tag=YOUR_AFFILIATE_TAG',
  'psychology', 'intermediate', true, 1
where not exists (select 1 from public.school_books where title_en = 'Trading in the Zone');

insert into public.school_books
  (title_ja, title_en, title_pt, title_es, author,
   description_ja, description_en,
   affiliate_url_ja, affiliate_url_en, category, difficulty, is_featured, sort_order)
select
  'デイトレード', 'Day Trade Online',
  'Day Trade Online', 'Day Trade Online',
  'オリバー・ベレス',
  'デイトレードの基本戦略と実践テクニック。',
  'Foundational day trading strategies and practical techniques.',
  'https://www.amazon.co.jp/dp/4775990306?tag=YOUR_AFFILIATE_TAG',
  'https://www.amazon.com/dp/047155928X?tag=YOUR_AFFILIATE_TAG',
  'strategy', 'beginner', true, 2
where not exists (select 1 from public.school_books where title_en = 'Day Trade Online');
