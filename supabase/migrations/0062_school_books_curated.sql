-- 0062: 「本」タブに定番トレード書籍を curated 追加（既存2冊→計8冊）。
--  タイトル(ja/en)・著者・説明(ja)・カテゴリ・難易度・評価を投入。
--  ⚠️ affiliate_url / cover_image_url は null（プレースホルダ）。Jeff さんが各書籍の
--     アフィリエイトリンク(Amazonアソシエイト等)と書影URLを設定してください。
--     設定するまでタップは無反応です（壊れたリンクは出しません）。
--  冪等: title_ja 重複チェック。
--  既存: 「ゾーン — 相場心理学入門」「デイトレード」(sort 1,2) → 新規は sort 3..8。

insert into public.school_books
  (title_ja, title_en, author, description_ja, category, difficulty, rating, is_featured, sort_order)
select * from (values
  ('マーケットの魔術師', 'Market Wizards', 'ジャック・D・シュワッガー',
   '伝説のトレーダーたちへのインタビュー集。成功する者に共通する規律とメンタルが浮かび上がる、不朽の名著。',
   'psychology', 'intermediate', 4.7, true, 3),
  ('投資苑 — 心理・戦略・資金管理', 'Trading for a Living', 'アレキサンダー・エルダー',
   '「心理・手法・資金管理」の3本柱を体系的に学べる総合入門書。トレードの全体像を掴みたい人に。',
   'strategy', 'intermediate', 4.5, true, 4),
  ('先物市場のテクニカル分析', 'Technical Analysis of the Financial Markets', 'ジョン・J・マーフィー',
   'テクニカル分析のバイブル。トレンド・チャートパターン・指標を網羅した、分析を極めたい人の必読書。',
   'technical', 'advanced', 4.6, false, 5),
  ('規律とトレーダー', 'The Disciplined Trader', 'マーク・ダグラス',
   '「ゾーン」の著者による心理学の原点。なぜ規律が崩れるのか、その仕組みと克服法を解き明かす。',
   'psychology', 'intermediate', 4.4, false, 6),
  ('魔術師たちの心理学', 'Trade Your Way to Financial Freedom', 'バン・K・タープ',
   'ポジションサイジング(資金管理)と期待値の考え方を徹底解説。「手法より資金管理」を学べる一冊。',
   'risk', 'advanced', 4.4, false, 7),
  ('タートル流投資の魔術', 'Way of the Turtle', 'カーティス・フェイス',
   '実在のトレード集団「タートルズ」のルールを公開。再現性あるルールベース・トレードの教科書。',
   'strategy', 'advanced', 4.3, false, 8)
) as v(title_ja, title_en, author, description_ja, category, difficulty, rating, is_featured, sort_order)
where not exists (select 1 from public.school_books b where b.title_ja = v.title_ja);
