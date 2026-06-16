-- 0064: 書籍の表紙を Open Library の無料表紙API(実表紙)で設定。
--  各 ISBN は事前に存在確認済(HTTP 200・実画像)。expo-image がリダイレクトを追って表示。
--  併せて、口座ロゴ/将来の画像用に公開 Storage バケットを作成(Jeff が公式ロゴをアップ)。
-- idempotent

-- 書籍の表紙(title_ja でマッチ)
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780735201446-L.jpg' where title_ja = 'ゾーン — 相場心理学入門';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780071360531-L.jpg' where title_ja = 'デイトレード';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780887306105-L.jpg' where title_ja = 'マーケットの魔術師';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780471592242-L.jpg' where title_ja = '投資苑 — 心理・戦略・資金管理';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780735200661-L.jpg' where title_ja = '先物市場のテクニカル分析';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780132157575-L.jpg' where title_ja = '規律とトレーダー';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780071478717-L.jpg' where title_ja = '魔術師たちの心理学';
update public.school_books set cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780071486644-L.jpg' where title_ja = 'タートル流投資の魔術';

-- 口座ロゴ・将来のスクール画像用の公開バケット
insert into storage.buckets (id, name, public)
values ('school-assets', 'school-assets', true)
on conflict (id) do update set public = true;
