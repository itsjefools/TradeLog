-- 0069 スクール動画リスト投入（テンプレ・無料5本 + Premium15本）
-- ============================================================================
-- 無料動画(基礎)    = video_source='youtube',  is_free=true。  youtube_video_id を実IDに差し替え。
-- Premium動画(自社) = video_source='cloudflare', is_free=false。stream_uid を Cloudflare のUIDに差し替え。
--
-- 差し替えの目印:
--   ・無料:    youtube_video_id = 'YT_REPLACE_n'  → 実際の YouTube 動画ID へ
--   ・Premium: stream_uid       = 'CF_REPLACE_n'  → Cloudflare Stream の UID へ
--
-- 題名(title_ja)で重複ガードしているので冪等。en/pt/es 題名・説明は後から追加してよい
-- （未設定なら ja にフォールバックして表示される）。duration_seconds は仮の目安。
--
-- ※ 旧テストデータ(「FX初心者が最初に知るべきこと」等)を消したい場合は末尾の
--   コメントアウトした DELETE を使う（任意）。
-- ============================================================================

insert into public.school_videos
  (title_ja, description_ja, youtube_video_id, stream_uid, video_source,
   category, difficulty, duration_seconds, is_free, is_featured, sort_order)
select v.* from (values
  -- ---- 無料(基礎) 5本 ---------------------------------------------------
  ('FXとは？ゼロから分かる仕組み',
   '為替が動く理由・通貨ペア・なぜ利益や損失が出るのかを一から解説します。',
   'YT_REPLACE_1', null::text, 'youtube', 'basics', 'beginner', 360::int, true, true, 1),
  ('pips・ロット・損益計算の基礎',
   '取引単位の読み方と「1pips＝いくら？」を具体例で理解します。',
   'YT_REPLACE_2', null, 'youtube', 'basics', 'beginner', 300, true, false, 2),
  ('注文の種類（成行・指値・逆指値）',
   'エントリーと損切り・利確の置き方、注文の使い分けを学びます。',
   'YT_REPLACE_3', null, 'youtube', 'basics', 'beginner', 420, true, false, 3),
  ('ローソク足の読み方入門',
   '1本のローソク足から相場の勢いと売買バランスを読み取ります。',
   'YT_REPLACE_4', null, 'youtube', 'basics', 'beginner', 480, true, false, 4),
  ('FXの始め方とリスク管理の鉄則',
   '口座開設の流れから資金管理・損切りの重要性まで。負けない土台を作ります。',
   'YT_REPLACE_5', null, 'youtube', 'basics', 'beginner', 420, true, false, 5),

  -- ---- Premium(自社・テクニカル) ---------------------------------------
  ('移動平均線を極める',
   'パーフェクトオーダー・ゴールデン/デッドクロス・グランビルの法則で売買タイミングを掴みます。',
   null, 'CF_REPLACE_1', 'cloudflare', 'technical', 'intermediate', 900, false, true, 10),
  ('サポート＆レジスタンスの引き方',
   '「効く」水平線の見極めと、反転を狙う実践的なエントリーを解説します。',
   null, 'CF_REPLACE_2', 'cloudflare', 'technical', 'intermediate', 840, false, false, 11),
  ('トレンドラインとチャネル分析',
   '押し目買い・戻り売りをラインで機械的に狙う方法を学びます。',
   null, 'CF_REPLACE_3', 'cloudflare', 'technical', 'intermediate', 780, false, false, 12),
  ('RSI・MACDで過熱とモメンタムを読む',
   'オシレーターの使い方と、ダイバージェンスでの先読みを解説します。',
   null, 'CF_REPLACE_4', 'cloudflare', 'technical', 'intermediate', 900, false, false, 13),
  ('フィボナッチ・リトレースメント実践',
   '押し戻りの目標値を測り、エントリー精度を上げます。',
   null, 'CF_REPLACE_5', 'cloudflare', 'technical', 'advanced', 720, false, false, 14),
  ('ダウ理論とトレンドの本質',
   '高値・安値の構造で相場の波を捉え、流れに乗る考え方を学びます。',
   null, 'CF_REPLACE_6', 'cloudflare', 'technical', 'advanced', 960, false, false, 15),

  -- ---- Premium(自社・手法/戦略) ----------------------------------------
  ('環境認識（マルチタイムフレーム分析）',
   '上位足で方向、下位足でタイミング。負けない場所を選ぶ技術です。',
   null, 'CF_REPLACE_7', 'cloudflare', 'strategy', 'intermediate', 1020, false, true, 16),
  ('デイトレード手法の組み立て方',
   '環境認識→エントリー→決済の「型」を一連で習得します。',
   null, 'CF_REPLACE_8', 'cloudflare', 'strategy', 'intermediate', 1080, false, false, 17),
  ('スキャルピングの基礎と優位性',
   '短期売買のロジックと、スプレッド・約定の注意点を解説します。',
   null, 'CF_REPLACE_9', 'cloudflare', 'strategy', 'advanced', 840, false, false, 18),
  ('スイングトレードで大きく狙う',
   '数日〜数週間のトレンドフォローと、保有の考え方を学びます。',
   null, 'CF_REPLACE_10', 'cloudflare', 'strategy', 'intermediate', 900, false, false, 19),
  ('勝てるトレードルールの作り方',
   '検証→ルール化→期待値管理で、再現性のあるトレードを作ります。',
   null, 'CF_REPLACE_11', 'cloudflare', 'strategy', 'advanced', 1140, false, false, 20),

  -- ---- Premium(自社・心理/資金管理) ------------------------------------
  ('メンタル管理とトレード心理',
   '恐怖と欲望をコントロールし、ルールを守り抜く方法を解説します。',
   null, 'CF_REPLACE_12', 'cloudflare', 'psychology', 'intermediate', 780, false, false, 21),
  ('損切りができない人へ',
   '損失を受け入れる思考法と、塩漬けを断つ仕組み化を学びます。',
   null, 'CF_REPLACE_13', 'cloudflare', 'psychology', 'intermediate', 720, false, false, 22),
  ('資金管理とロット計算の実践',
   '2%ルール・破産確率を下げるポジションサイジングを身につけます。',
   null, 'CF_REPLACE_14', 'cloudflare', 'strategy', 'intermediate', 840, false, false, 23),
  ('トレードノートの付け方と振り返り',
   '記録から弱点を発見し改善するループ。TradeLog の活用法も紹介します。',
   null, 'CF_REPLACE_15', 'cloudflare', 'psychology', 'beginner', 660, false, false, 24)
) as v(title_ja, description_ja, youtube_video_id, stream_uid, video_source,
       category, difficulty, duration_seconds, is_free, is_featured, sort_order)
where not exists (
  select 1 from public.school_videos s where s.title_ja = v.title_ja
);

-- （任意）旧テストデータを消す場合はコメントを外す:
-- delete from public.school_videos
-- where title_ja in ('FX初心者が最初に知るべきこと', 'ローソク足の基本パターン', '移動平均線の使い方');
