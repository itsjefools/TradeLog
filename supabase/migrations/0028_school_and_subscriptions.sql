-- TradeLog: スクール機能 + IAP サブスクリプション管理
--
-- 設計:
--   - school_categories: レッスンカテゴリ (4言語ローカライズ済タイトル + アイコン/色)
--   - school_lessons: レッスン本文 (4言語、難易度、無料/有料)
--   - user_subscriptions: ユーザーの IAP 購入レコード (RevenueCat から react-native-iap へ移行に伴い新設)
--   - user_lesson_progress: 閲覧/完了の追跡
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. school_categories
-- ============================================================================

create table if not exists public.school_categories (
  id          uuid primary key default gen_random_uuid(),
  name_ja     text not null,
  name_en     text not null,
  name_pt     text not null,
  name_es     text not null,
  icon        text default 'book-outline',
  color       text default '#10B981',
  sort_order  integer default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_school_categories_sort_order
  on public.school_categories (sort_order);

-- ============================================================================
-- 2. school_lessons
-- ============================================================================

create table if not exists public.school_lessons (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.school_categories(id) on delete cascade,
  title_ja          text not null,
  title_en          text not null,
  title_pt          text not null,
  title_es          text not null,
  content_ja        text,
  content_en        text,
  content_pt        text,
  content_es        text,
  duration_minutes  integer default 5,
  difficulty        text default 'beginner'
                    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  is_free           boolean default true,
  sort_order        integer default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_school_lessons_category_id
  on public.school_lessons (category_id);
create index if not exists idx_school_lessons_sort_order
  on public.school_lessons (sort_order);

-- ============================================================================
-- 3. user_subscriptions (react-native-iap 移行用)
-- ============================================================================

create table if not exists public.user_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      text not null,
  purchase_token  text,
  platform        text check (platform in ('ios', 'android')),
  status          text default 'active'
                  check (status in ('active', 'expired', 'cancelled')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_user_subscriptions_user_id
  on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_active
  on public.user_subscriptions (user_id, status, expires_at);

-- ============================================================================
-- 4. user_lesson_progress
-- ============================================================================

create table if not exists public.user_lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     uuid not null references public.school_lessons(id) on delete cascade,
  is_completed  boolean default false,
  last_read_at  timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists idx_user_lesson_progress_user_id
  on public.user_lesson_progress (user_id);

-- ============================================================================
-- 5. RLS
-- ============================================================================

alter table public.school_categories     enable row level security;
alter table public.school_lessons        enable row level security;
alter table public.user_subscriptions    enable row level security;
alter table public.user_lesson_progress  enable row level security;

drop policy if exists "school_categories_read_all" on public.school_categories;
create policy "school_categories_read_all"
  on public.school_categories for select using (true);

drop policy if exists "school_lessons_read_all" on public.school_lessons;
create policy "school_lessons_read_all"
  on public.school_lessons for select using (true);

drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_insert_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_delete_own" on public.user_subscriptions;

create policy "user_subscriptions_select_own"
  on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "user_subscriptions_insert_own"
  on public.user_subscriptions for insert with check (auth.uid() = user_id);
create policy "user_subscriptions_update_own"
  on public.user_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_subscriptions_delete_own"
  on public.user_subscriptions for delete using (auth.uid() = user_id);

drop policy if exists "user_lesson_progress_select_own" on public.user_lesson_progress;
drop policy if exists "user_lesson_progress_insert_own" on public.user_lesson_progress;
drop policy if exists "user_lesson_progress_update_own" on public.user_lesson_progress;
drop policy if exists "user_lesson_progress_delete_own" on public.user_lesson_progress;

create policy "user_lesson_progress_select_own"
  on public.user_lesson_progress for select using (auth.uid() = user_id);
create policy "user_lesson_progress_insert_own"
  on public.user_lesson_progress for insert with check (auth.uid() = user_id);
create policy "user_lesson_progress_update_own"
  on public.user_lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_lesson_progress_delete_own"
  on public.user_lesson_progress for delete using (auth.uid() = user_id);

-- ============================================================================
-- 6. 初期データ: カテゴリ
-- ============================================================================

insert into public.school_categories (name_ja, name_en, name_pt, name_es, icon, color, sort_order)
values
  ('FXの基礎',       'FX Basics',           'Fundamentos de FX',     'Fundamentos de FX',    'book-outline',              '#10B981', 1),
  ('テクニカル分析', 'Technical Analysis',  'Análise Técnica',       'Análisis Técnico',     'trending-up-outline',       '#3B82F6', 2),
  ('リスク管理',     'Risk Management',     'Gestão de Risco',       'Gestión de Riesgo',    'shield-checkmark-outline',  '#F59E0B', 3),
  ('トレード心理学', 'Trading Psychology',  'Psicologia do Trading', 'Psicología del Trading','bulb-outline',              '#8B5CF6', 4),
  ('実践手法',       'Trading Strategies',  'Estratégias de Trading','Estrategias de Trading','flash-outline',            '#EF4444', 5)
on conflict do nothing;

-- ============================================================================
-- 7. 初期データ: 無料レッスン (FX Basics)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes, content_ja, content_en)
select
  (select id from public.school_categories where name_en = 'FX Basics'),
  'FXとは？', 'What is Forex?', 'O que é Forex?', '¿Qué es Forex?',
  'beginner', true, 1, 5,
  E'# FXとは？\n\nFX（Foreign Exchange）は外国為替証拠金取引の略称です。\n\n## 基本的な仕組み\n\n2つの通貨を交換（売買）することで利益を狙う取引です。\n\n例えば、1ドル=150円の時にドルを買い、1ドル=152円になった時に売れば、2円の利益が出ます。\n\n## FXの特徴\n\n- **24時間取引可能**: 月曜早朝〜土曜早朝まで\n- **レバレッジ**: 少額の資金で大きな取引が可能\n- **双方向取引**: 上がっても下がっても利益を狙える',
  E'# What is Forex?\n\nForex (Foreign Exchange) is the trading of currency pairs.\n\n## How it works\n\nYou profit by buying a currency at one price and selling at another.\n\n## Key features\n\n- **24-hour market**\n- **Leverage available**\n- **Profit in both directions**'
where not exists (
  select 1 from public.school_lessons where title_en = 'What is Forex?'
);

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'FX Basics'),
  '通貨ペアの仕組み', 'How Currency Pairs Work', 'Como Funcionam os Pares', 'Cómo Funcionan los Pares',
  'beginner', true, 2, 7
where not exists (select 1 from public.school_lessons where title_en = 'How Currency Pairs Work');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'FX Basics'),
  'pipsとロット', 'Pips and Lots', 'Pips e Lotes', 'Pips y Lotes',
  'beginner', true, 3, 6
where not exists (select 1 from public.school_lessons where title_en = 'Pips and Lots');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'FX Basics'),
  '注文の種類', 'Order Types', 'Tipos de Ordens', 'Tipos de Órdenes',
  'beginner', true, 4, 8
where not exists (select 1 from public.school_lessons where title_en = 'Order Types');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'FX Basics'),
  'スプレッドとスワップ', 'Spreads and Swaps', 'Spreads e Swaps', 'Spreads y Swaps',
  'beginner', true, 5, 5
where not exists (select 1 from public.school_lessons where title_en = 'Spreads and Swaps');

-- ============================================================================
-- 8. 初期データ: 有料レッスン
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'ローソク足パターン完全ガイド', 'Complete Candlestick Guide', 'Guia Completo de Candlesticks', 'Guía Completa de Velas',
  'intermediate', false, 1, 15
where not exists (select 1 from public.school_lessons where title_en = 'Complete Candlestick Guide');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'サポート＆レジスタンスの実践', 'Support & Resistance in Practice', 'Suporte e Resistência', 'Soporte y Resistencia',
  'intermediate', false, 2, 12
where not exists (select 1 from public.school_lessons where title_en = 'Support & Resistance in Practice');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'Trading Strategies'),
  'スキャルピング手法', 'Scalping Strategy', 'Estratégia de Scalping', 'Estrategia de Scalping',
  'advanced', false, 1, 20
where not exists (select 1 from public.school_lessons where title_en = 'Scalping Strategy');

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es, difficulty, is_free, sort_order, duration_minutes)
select
  (select id from public.school_categories where name_en = 'Trading Strategies'),
  'スイングトレード入門', 'Swing Trading Intro', 'Introdução ao Swing Trade', 'Introducción al Swing Trading',
  'advanced', false, 2, 18
where not exists (select 1 from public.school_lessons where title_en = 'Swing Trading Intro');
