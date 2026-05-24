-- TradeLog: トレードに手法タグを付与（タグ別分析の土台）
--   trades.tags … 手法/セットアップのタグ配列（例: 'breakout','news','pullback'）
-- idempotent

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- タグ検索/集計を高速化（任意）
CREATE INDEX IF NOT EXISTS trades_tags_gin ON public.trades USING gin (tags);
