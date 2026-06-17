-- 0067 書籍アフィリエイトタグの本番置換（冪等・上書き版）
-- ============================================================================
-- 目的: 書籍リンクの ?tag=... を Jeff の実 Amazon アソシエイトID に設定して収益化する。
--
-- 実ID: itsjefools-22 （2026-06-17 発行・審査中。IDはリンク設定に即利用可）
--
-- 冪等: amazon.co.jp の全書籍リンクの tag= を一律で上書きするので、何度実行しても
--       同じ結果になる。タグ変更時はこの値を直して再実行すればよい。
-- ============================================================================

update public.school_books
set affiliate_url_ja = regexp_replace(
  affiliate_url_ja,
  'tag=[^&]*',
  'tag=itsjefools-22'   -- Amazon アソシエイトID
)
where affiliate_url_ja like '%amazon.co.jp%';

-- 確認用 (任意): 置換後の6冊のリンクを表示
-- select title_ja, affiliate_url_ja from public.school_books order by sort_order;
