-- TradeLog: 壁紙機能 (背景テンプレ + プリセットルール + ユーザー生成壁紙 + いいね)
--
-- 設計:
--   - wallpaper_backgrounds: 運営が用意する背景画像 (ダーク/ライト/グラデーション等)
--   - wallpaper_rules:       プリセットのトレードルール (4言語ローカライズ)
--   - user_wallpapers:       ユーザーが生成した壁紙 (画像はギャラリー公開可)
--   - wallpaper_likes:       ギャラリー壁紙へのいいね
--   - increment_wallpaper_downloads(uuid): ダウンロード数を1増やす RPC
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. wallpaper_backgrounds
-- ============================================================================

create table if not exists public.wallpaper_backgrounds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  category    text default 'dark'
              check (category in ('dark', 'light', 'gradient', 'minimal', 'photo')),
  is_premium  boolean default false,
  sort_order  integer default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_wallpaper_backgrounds_sort
  on public.wallpaper_backgrounds (sort_order);

-- ============================================================================
-- 2. wallpaper_rules (4言語ローカライズ)
-- ============================================================================

create table if not exists public.wallpaper_rules (
  id          uuid primary key default gen_random_uuid(),
  text_ja     text not null,
  text_en     text not null,
  text_pt     text not null,
  text_es     text not null,
  category    text default 'risk'
              check (category in ('risk', 'entry', 'exit', 'mindset', 'discipline')),
  sort_order  integer default 0
);

create index if not exists idx_wallpaper_rules_sort
  on public.wallpaper_rules (sort_order);

-- ============================================================================
-- 3. user_wallpapers
-- ============================================================================

create table if not exists public.user_wallpapers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  image_url       text not null,
  background_id   uuid references public.wallpaper_backgrounds(id) on delete set null,
  rules_text      text,
  is_public       boolean default false,
  like_count      integer default 0,
  download_count  integer default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_user_wallpapers_user_id
  on public.user_wallpapers (user_id);
create index if not exists idx_user_wallpapers_public
  on public.user_wallpapers (is_public, like_count desc);

-- ============================================================================
-- 4. wallpaper_likes
-- ============================================================================

create table if not exists public.wallpaper_likes (
  id            uuid primary key default gen_random_uuid(),
  wallpaper_id  uuid not null references public.user_wallpapers(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (wallpaper_id, user_id)
);

create index if not exists idx_wallpaper_likes_wallpaper
  on public.wallpaper_likes (wallpaper_id);
create index if not exists idx_wallpaper_likes_user
  on public.wallpaper_likes (user_id);

-- ============================================================================
-- 5. RLS
-- ============================================================================

alter table public.wallpaper_backgrounds enable row level security;
alter table public.wallpaper_rules        enable row level security;
alter table public.user_wallpapers        enable row level security;
alter table public.wallpaper_likes        enable row level security;

drop policy if exists "wallpaper_backgrounds_read_all" on public.wallpaper_backgrounds;
create policy "wallpaper_backgrounds_read_all"
  on public.wallpaper_backgrounds for select using (true);

drop policy if exists "wallpaper_rules_read_all" on public.wallpaper_rules;
create policy "wallpaper_rules_read_all"
  on public.wallpaper_rules for select using (true);

drop policy if exists "user_wallpapers_select"        on public.user_wallpapers;
drop policy if exists "user_wallpapers_insert_own"    on public.user_wallpapers;
drop policy if exists "user_wallpapers_update_own"    on public.user_wallpapers;
drop policy if exists "user_wallpapers_delete_own"    on public.user_wallpapers;

create policy "user_wallpapers_select"
  on public.user_wallpapers for select
  using (is_public = true or auth.uid() = user_id);

create policy "user_wallpapers_insert_own"
  on public.user_wallpapers for insert with check (auth.uid() = user_id);

create policy "user_wallpapers_update_own"
  on public.user_wallpapers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_wallpapers_delete_own"
  on public.user_wallpapers for delete using (auth.uid() = user_id);

drop policy if exists "wallpaper_likes_read_all"     on public.wallpaper_likes;
drop policy if exists "wallpaper_likes_insert_own"   on public.wallpaper_likes;
drop policy if exists "wallpaper_likes_delete_own"   on public.wallpaper_likes;

create policy "wallpaper_likes_read_all"
  on public.wallpaper_likes for select using (true);

create policy "wallpaper_likes_insert_own"
  on public.wallpaper_likes for insert with check (auth.uid() = user_id);

create policy "wallpaper_likes_delete_own"
  on public.wallpaper_likes for delete using (auth.uid() = user_id);

-- ============================================================================
-- 6. like_count 自動同期トリガー
-- ============================================================================

create or replace function public.update_wallpaper_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.user_wallpapers
       set like_count = like_count + 1
     where id = new.wallpaper_id;
  elsif (tg_op = 'DELETE') then
    update public.user_wallpapers
       set like_count = greatest(0, like_count - 1)
     where id = old.wallpaper_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_wallpaper_like_count on public.wallpaper_likes;
create trigger trg_wallpaper_like_count
  after insert or delete on public.wallpaper_likes
  for each row execute function public.update_wallpaper_like_count();

-- ============================================================================
-- 7. download_count RPC
-- ============================================================================

create or replace function public.increment_wallpaper_downloads(wp_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_wallpapers
     set download_count = download_count + 1
   where id = wp_id;
end;
$$;

-- ============================================================================
-- 8. 初期データ: プリセットルール (5カテゴリ × 2件ずつ)
-- ============================================================================

insert into public.wallpaper_rules (text_ja, text_en, text_pt, text_es, category, sort_order)
select * from (values
  ('損切りは必ず守る',           'Always honor your stop-loss',           'Sempre respeite seu stop-loss',                   'Siempre respeta tu stop-loss',                  'risk',       1),
  ('リスクは資金の2%以下',       'Risk no more than 2% per trade',        'Arrisque no máximo 2% por operação',              'No arriesgues más del 2% por operación',        'risk',       2),
  ('1日の損失上限を決める',      'Set a daily loss limit',                'Defina um limite diário de perda',                'Establece un límite diario de pérdida',         'risk',       3),
  ('感情でエントリーしない',      'Never enter on emotion',                'Nunca entre por emoção',                          'Nunca entres por emoción',                      'mindset',    4),
  ('勝率より損益比を重視する',    'Focus on R:R, not win rate',            'Foque no R:R, não na taxa de acerto',             'Enfócate en R:R, no en la tasa de aciertos',    'mindset',    5),
  ('相場は逃げない、焦るな',      'The market is not going anywhere',      'O mercado não vai a lugar nenhum',                'El mercado no se va a ningún lado',             'mindset',    6),
  ('ルール通りにトレードする',    'Trade your plan',                       'Siga seu plano',                                  'Opera según tu plan',                           'discipline', 7),
  ('ナンピンは絶対にしない',      'Never average down',                    'Nunca faça preço médio',                          'Nunca promedies a la baja',                     'discipline', 8),
  ('トレード前にチャートを分析する','Analyze the chart before trading',     'Analise o gráfico antes de operar',               'Analiza el gráfico antes de operar',            'entry',      9),
  ('利確ポイントを事前に決める',  'Set your take-profit in advance',       'Defina seu take-profit antecipadamente',          'Define tu take-profit de antemano',             'exit',      10)
) as t(text_ja, text_en, text_pt, text_es, category, sort_order)
where not exists (
  select 1 from public.wallpaper_rules wr where wr.text_en = t.text_en
);
