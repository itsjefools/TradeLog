-- 0067 書籍アフィリエイトタグの本番置換（冪等・上書き版）
-- ============================================================================
-- 目的: 書籍リンクの ?tag=... を Jeff の実 Amazon アソシエイトID に設定して収益化する。
--
-- 経緯: 初版はプレースホルダ YOUR_AFFILIATE_TAG を置換する想定だったが、実IDが
--       未取得のまま適用され、現在は tag=YOUR_REAL_TAG_HERE（これも仮）になっている。
--       そこで「現在の tag 値が何であっても実IDに上書きする」冪等版にした。
--
-- 使い方:
--   1) Amazonアソシエイト (https://affiliate.amazon.co.jp/) に登録し、承認後に
--      トラッキングID（例: tradelog-22）を取得する。
--   2) 下の 'YOUR_REAL_TAG_HERE' を、その実IDに 1 箇所だけ書き換える。
--   3) Supabase SQL Editor で実行する ([[feedback_supabase_sql_manual]])。
--
-- 冪等: amazon.co.jp の全書籍リンクの tag= を一律で上書きするので、何度実行しても
--       同じ結果になる。実ID適用後の再実行も安全。
-- ============================================================================

update public.school_books
set affiliate_url_ja = regexp_replace(
  affiliate_url_ja,
  'tag=[^&]*',
  'tag=YOUR_REAL_TAG_HERE'   -- ← ここを実アソシエイトIDに書き換える (例: tag=tradelog-22)
)
where affiliate_url_ja like '%amazon.co.jp%';

-- 確認用 (任意): 置換後の6冊のリンクを表示
-- select title_ja, affiliate_url_ja from public.school_books order by sort_order;
