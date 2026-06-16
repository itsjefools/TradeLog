-- 0066: 「本」タブを指定の6冊だけにする。和書版のASINで表紙・リンクを一致させる。
--  ・表紙 = Amazon JP 書影(和書版 → 日本語タイトルと一致)
--  ・リンク = amazon.co.jp/dp/{ASIN}?tag=YOUR_AFFILIATE_TAG
--    ⚠️ tag=YOUR_AFFILIATE_TAG はプレースホルダ。Jeff の Amazon アソシエイトID に置換すると
--       収益化(購入で報酬)が有効になる。置換前でも「正しい本」へ遷移はする。
--  ・不要な4冊は削除(book_reviews は on delete cascade)。
-- idempotent(UPDATE/DELETE は再実行安全、INSERT は title_ja でガード)

-- 1) 指定外の本を削除
delete from public.school_books
where title_ja in (
  '投資苑 — 心理・戦略・資金管理',
  '規律とトレーダー',
  '魔術師たちの心理学',
  'タートル流投資の魔術'
);

-- 2) 既存4冊に 和書表紙 + リンク + 並び順 を設定
update public.school_books set
  cover_image_url = 'https://m.media-amazon.com/images/P/4939103579.09._SCLZZZZZZZ_.jpg',
  affiliate_url_ja = 'https://www.amazon.co.jp/dp/4939103579?tag=YOUR_AFFILIATE_TAG',
  is_featured = true, sort_order = 1
where title_ja = 'ゾーン — 相場心理学入門';

update public.school_books set
  cover_image_url = 'https://m.media-amazon.com/images/P/4822242978.09._SCLZZZZZZZ_.jpg',
  affiliate_url_ja = 'https://www.amazon.co.jp/dp/4822242978?tag=YOUR_AFFILIATE_TAG',
  is_featured = false, sort_order = 2
where title_ja = 'デイトレード';

update public.school_books set
  cover_image_url = 'https://m.media-amazon.com/images/P/4939103404.09._SCLZZZZZZZ_.jpg',
  affiliate_url_ja = 'https://www.amazon.co.jp/dp/4939103404?tag=YOUR_AFFILIATE_TAG',
  is_featured = true, sort_order = 3
where title_ja = 'マーケットの魔術師';

-- 「先物市場のテクニカル分析」→ 実際の和書名「マーケットのテクニカル分析」に改題して設定
update public.school_books set
  title_ja = 'マーケットのテクニカル分析',
  cover_image_url = 'https://m.media-amazon.com/images/P/477597226X.09._SCLZZZZZZZ_.jpg',
  affiliate_url_ja = 'https://www.amazon.co.jp/dp/477597226X?tag=YOUR_AFFILIATE_TAG',
  is_featured = false, sort_order = 4
where title_ja = '先物市場のテクニカル分析';

-- 3) 新規2冊を追加(エルダー)
insert into public.school_books
  (title_ja, title_en, author, description_ja, cover_image_url, affiliate_url_ja,
   category, difficulty, rating, is_featured, sort_order)
select * from (values
  ('ザ・トレーディング──心理分析・トレード戦略・リスク管理・記録管理',
   'The New Trading for a Living', 'アレキサンダー・エルダー',
   '心理・戦略・リスク管理・記録の4分野を1冊で網羅。エルダーによるトレード総合教本の決定版。',
   'https://m.media-amazon.com/images/P/4909074007.09._SCLZZZZZZZ_.jpg',
   'https://www.amazon.co.jp/dp/4909074007?tag=YOUR_AFFILIATE_TAG',
   'strategy', 'intermediate', 4.6, true, 5),
  ('ザ・トレーディング ワークブック',
   'The New Trading for a Living Study Guide', 'アレキサンダー・エルダー',
   '「ザ・トレーディング」の実践問題集。設問を解きながら知識と規律を定着させる副読本。',
   'https://m.media-amazon.com/images/P/4909074015.09._SCLZZZZZZZ_.jpg',
   'https://www.amazon.co.jp/dp/4909074015?tag=YOUR_AFFILIATE_TAG',
   'strategy', 'intermediate', 4.3, false, 6)
) as v(title_ja, title_en, author, description_ja, cover_image_url, affiliate_url_ja,
       category, difficulty, rating, is_featured, sort_order)
where not exists (select 1 from public.school_books b where b.title_ja = v.title_ja);
