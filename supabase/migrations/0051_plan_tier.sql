-- 0051: 課金プラン3層化 (Free / Plus / Pro)
-- profiles に plan_tier 列を追加する。
-- 従来の is_premium (boolean) は後方互換のため残し、アプリが plan_tier と併せて更新する。
--
-- ティア判定:
--   free  : 無料 (記録15件/月)
--   plus  : 記録30件/月 + 高度分析 + エクスポート(CSV) + 全レッスン + 広告なし
--   pro   : 無制限 + PDF + 成績シェア + AIレビュー + カスタムバッジ + コミュニティ作成
--
-- 招待リワード (bonus_premium_until) はアプリ側で Pro 相当として扱う (DB 列は不要)。

alter table profiles
  add column if not exists plan_tier text not null default 'free'
  check (plan_tier in ('free', 'plus', 'pro'));

-- 既存の課金者 (プレリリースのテスター想定) は安全側で pro に寄せる
update profiles
  set plan_tier = 'pro'
  where is_premium = true and plan_tier = 'free';
