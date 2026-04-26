export type TradeDirection = 'long' | 'short';
export type TradeResult = 'win' | 'loss';

export type TradeStyle =
  | 'scalping'
  | 'day_trading'
  | 'swing'
  | 'position';

export const TRADE_STYLE_OPTIONS: { value: TradeStyle; label: string }[] = [
  { value: 'scalping', label: 'スキャルピング' },
  { value: 'day_trading', label: 'デイトレード' },
  { value: 'swing', label: 'スイング' },
  { value: 'position', label: 'ポジショントレード' },
];

export function tradeStyleLabel(style: string | null | undefined): string {
  const found = TRADE_STYLE_OPTIONS.find((o) => o.value === style);
  return found ? found.label : '未設定';
}

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  trade_style: string | null;
  language: string | null;
  is_premium: boolean | null;
  nationality: string | null;
  is_verified: boolean | null;
  created_at: string | null;
};

export type Post = {
  id: string;
  user_id: string;
  trade_id: string | null;
  post_type: string;
  content: string | null;
  image_urls: string[] | null;
  hashtags: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
};

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
  image_urls: string[] | null;
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
  image_urls?: string[];
};

export const COMMON_CURRENCY_PAIRS = [
  'USD/JPY',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/USD',
  'GBP/USD',
  'AUD/JPY',
] as const;

// 検索可能な全銘柄リスト
// FXメジャー/マイナー/エキゾチック + 仮想通貨 + 貴金属 + 商品 + 株価指数
export const ALL_CURRENCY_PAIRS = [
  // FX Majors（メジャー通貨ペア）
  'EUR/USD',
  'USD/JPY',
  'GBP/USD',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',

  // 円クロス
  'EUR/JPY',
  'GBP/JPY',
  'AUD/JPY',
  'NZD/JPY',
  'CAD/JPY',
  'CHF/JPY',
  'TRY/JPY',
  'ZAR/JPY',
  'MXN/JPY',
  'SGD/JPY',
  'HKD/JPY',
  'CNH/JPY',

  // EUR クロス
  'EUR/GBP',
  'EUR/CHF',
  'EUR/AUD',
  'EUR/CAD',
  'EUR/NZD',

  // GBP クロス
  'GBP/CHF',
  'GBP/AUD',
  'GBP/CAD',
  'GBP/NZD',

  // AUD クロス
  'AUD/NZD',
  'AUD/CAD',
  'AUD/CHF',

  // その他クロス
  'CAD/CHF',
  'NZD/CAD',
  'NZD/CHF',

  // エキゾチック (USD ベース)
  'USD/MXN',
  'USD/ZAR',
  'USD/SEK',
  'USD/NOK',
  'USD/SGD',
  'USD/HKD',
  'USD/TRY',
  'USD/CNH',
  'USD/RUB',
  'USD/PLN',
  'USD/THB',

  // 仮想通貨
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'ADA/USD',
  'SOL/USD',
  'DOGE/USD',
  'BNB/USD',
  'MATIC/USD',
  'AVAX/USD',
  'DOT/USD',
  'LINK/USD',
  'LTC/USD',
  'BTC/JPY',
  'ETH/JPY',

  // 貴金属
  'XAU/USD',
  'XAG/USD',
  'XPT/USD',
  'XPD/USD',

  // エネルギー・商品
  'WTI/USD',
  'BRENT/USD',
  'NATGAS/USD',
  'COPPER/USD',

  // 株価指数 CFD
  'US30',
  'NAS100',
  'SPX500',
  'JP225',
  'GER40',
  'UK100',
  'FRA40',
  'AUS200',
  'HK50',
] as const;

// FX として扱える通貨コード（pips自動計算用）
const FX_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD',
  'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'TRY', 'ZAR', 'MXN',
  'CNH', 'PLN', 'THB', 'RUB',
]);

// FX通貨ペアかどうか判定（pips自動計算の対象判別用）
export function isFxPair(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(upper)) return false;
  const [base, quote] = upper.split('/');
  return FX_CURRENCIES.has(base) && FX_CURRENCIES.has(quote);
}
