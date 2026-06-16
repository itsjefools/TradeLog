-- 0061: スクールに「おすすめFX口座/ツール」アフィリエイト枠を追加。
--  書籍より収益性が高い口座開設アフィリの器。多言語のキャッチ・特徴・アフィリURLを持つ。
--  ⚠️ 下の curated 行の affiliate_url は各社の「公式トップ」を仮置きしています。
--     Jeff さんが各ASPの「自分のアフィリエイトリンク」に差し替えてください（収益化のため必須）。
--  公開読み取りは is_active = true の行のみ。クリックは school_affiliate_clicks(0059, kind='broker') に記録。
-- idempotent

create table if not exists public.school_brokers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                 -- ブランド名（共通表示）
  region          text not null default 'jp',    -- 'jp' | 'global' 等、出し分け用
  tagline_ja      text, tagline_en text, tagline_pt text, tagline_es text,
  features_ja     text, features_en text, features_pt text, features_es text,  -- 改行区切りの箇条書き
  badge_ja        text, badge_en text, badge_pt text, badge_es text,           -- 「初心者に人気」等（任意）
  logo_url        text,
  affiliate_url_ja text, affiliate_url_en text, affiliate_url_pt text, affiliate_url_es text,
  rating          numeric not null default 0,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_school_brokers_active_sort
  on public.school_brokers (is_active, sort_order);

alter table public.school_brokers enable row level security;

drop policy if exists "read active brokers" on public.school_brokers;
create policy "read active brokers"
  on public.school_brokers
  for select
  to authenticated, anon
  using (is_active = true);

grant select on public.school_brokers to authenticated, anon;

-- ============================================================================
-- curated 行（affiliate_url は公式トップの仮置き → Jeff がアフィリリンクに差し替え）
-- ============================================================================

insert into public.school_brokers
  (name, region, tagline_ja, features_ja, badge_ja, affiliate_url_ja, rating, sort_order)
select * from (values
  ('DMM FX', 'jp',
   '国内口座数トップクラス。初心者にやさしい総合力。',
   E'スプレッド業界最狭水準\n取引ツールが直感的で使いやすい\n最短即日で取引開始\nLINEでのサポートに対応',
   '初心者に人気', 'https://fx.dmm.com/', 4.5, 1),
  ('みんなのFX', 'jp',
   '低スプレッド＋高水準スワップ。コスト重視派に。',
   E'業界最狭水準のスプレッド\n高水準のスワップポイント\n1,000通貨から取引可能\n自動売買(システムトレード)にも対応',
   'コスト重視', 'https://min-fx.jp/', 4.3, 2),
  ('GMOクリック証券', 'jp',
   'FX取引高 世界トップクラスの実績と安心感。',
   E'FX年間取引高 世界第1位の実績\n高機能チャートと豊富な分析ツール\n各種手数料が無料\n大手GMOグループの信頼性',
   '実績No.1', 'https://www.click-sec.com/', 4.4, 3),
  ('XM Trading', 'global',
   '海外口座の定番。レバレッジとボーナスが魅力。',
   E'最大レバレッジが高く少額から狙える\n豪華な口座開設・入金ボーナス\n日本語サポートが充実\n約定力に定評',
   '海外口座', 'https://www.xmtrading.com/', 4.2, 4)
) as v(name, region, tagline_ja, features_ja, badge_ja, affiliate_url_ja, rating, sort_order)
where not exists (select 1 from public.school_brokers);
