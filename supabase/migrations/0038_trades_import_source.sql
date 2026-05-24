-- TradeLog: 取引のインポート対応 (MT5レポート取込)
--   trades.external_id … 取込元の一意ID(MT5のポジション番号)。重複取込を防ぐ。
--   trades.source       … 'manual' | 'mt5_import'（既定 manual）
-- idempotent

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- 同じユーザー × 同じ external_id は1件だけ（external_id がある行のみ対象）
CREATE UNIQUE INDEX IF NOT EXISTS trades_user_external_uniq
  ON public.trades (user_id, external_id)
  WHERE external_id IS NOT NULL;
