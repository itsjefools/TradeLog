export type TradeDirection = 'long' | 'short';
export type TradeResult = 'win' | 'loss';

export type Trade = {
  id: string;
  user_id: string;
  currency_pair: string;
  direction: TradeDirection;
  result: TradeResult | null;
  entry_price: number | null;
  exit_price: number | null;
  lot_size: number;
  pnl: number | null;
  pnl_pips: number | null;
  memo: string | null;
  traded_at: string;
  is_shared: boolean;
  created_at: string;
};

export type TradeInsert = {
  currency_pair: string;
  direction: TradeDirection;
  result?: TradeResult | null;
  entry_price?: number | null;
  exit_price?: number | null;
  lot_size: number;
  pnl?: number | null;
  pnl_pips?: number | null;
  memo?: string | null;
  traded_at?: string;
  is_shared?: boolean;
};

export const COMMON_CURRENCY_PAIRS = [
  'USD/JPY',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/USD',
  'GBP/USD',
  'AUD/JPY',
] as const;
