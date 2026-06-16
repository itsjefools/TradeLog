-- 0065: 書籍の「表紙≠題名」「リンク先が別の本」問題を解消。
--  ・自動取得した表紙は英語版で日本語タイトルと一致しない → cover_image_url を null に戻し、
--    タイトル一致が保証される「生成表紙(色+題名+著者)」に統一する。
--  ・既存2冊の affiliate_url は tag=YOUR_AFFILIATE_TAG のプレースホルダ＋誤ASINで別の本が開く
--    → null 化し、Jeff が正しいアフィリエイトリンクを設定するまでタップ無反応(誤遷移を防止)。
--  実カバー(和書版)を出したい場合は、各書のAmazon JP ASIN(または書影URL)を別途設定する。
-- idempotent

-- 全書籍の表紙を生成表紙に統一(英語版表紙の不一致を解消)
update public.school_books set cover_image_url = null where cover_image_url is not null;

-- 誤った/プレースホルダのアフィリリンクを除去(全書籍)
update public.school_books
set affiliate_url_ja = null, affiliate_url_en = null,
    affiliate_url_pt = null, affiliate_url_es = null
where affiliate_url_ja is not null or affiliate_url_en is not null
   or affiliate_url_pt is not null or affiliate_url_es is not null;
