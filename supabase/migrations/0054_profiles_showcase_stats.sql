-- 0054: プロフィールに表示する成績指標（最大3つ）をユーザーが選べるようにする
--  - profiles.showcase_stats text[] を追加（例: {win_rate, streak, cumulative_pnl}）
--  - 未設定(null)の場合はアプリ側でデフォルト(勝率/連勝/累計損益)にフォールバック
-- idempotent

alter table public.profiles
  add column if not exists showcase_stats text[];
