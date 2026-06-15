export type TradeDirection = 'long' | 'short';
export type TradeResult = 'win' | 'loss';

export type TradeStyle =
  | 'scalping'
  | 'day_trading'
  | 'swing'
  | 'position'
  | 'smc'
  | 'ict'
  | 'price_action'
  | 'dow'
  | 'elliott'
  | 'fibonacci'
  | 'bollinger'
  | 'fimathe'
  | 'trend_follow'
  | 'breakout'
  | 'harmonic'
  | 'grid';

// i18nKey があれば多言語ラベルを優先、無ければ label（固有名詞/手法名）をそのまま表示
export const TRADE_STYLE_OPTIONS: {
  value: TradeStyle;
  label: string;
  i18nKey?: string;
}[] = [
  { value: 'scalping', label: 'スキャルピング', i18nKey: 'auth.styleScalping' },
  { value: 'day_trading', label: 'デイトレード', i18nKey: 'auth.styleDayTrading' },
  { value: 'swing', label: 'スイング', i18nKey: 'auth.styleSwing' },
  { value: 'position', label: 'ポジショントレード', i18nKey: 'auth.stylePosition' },
  { value: 'smc', label: 'SMC' },
  { value: 'ict', label: 'ICT' },
  { value: 'price_action', label: 'プライスアクション' },
  { value: 'dow', label: 'ダウ理論' },
  { value: 'elliott', label: 'エリオット波動' },
  { value: 'fibonacci', label: 'フィボナッチ' },
  { value: 'bollinger', label: 'ボリンジャーバンド' },
  { value: 'fimathe', label: 'Fimathe' },
  { value: 'trend_follow', label: 'トレンドフォロー' },
  { value: 'breakout', label: 'ブレイクアウト' },
  { value: 'harmonic', label: 'ハーモニック' },
  { value: 'grid', label: 'グリッド' },
];

export function tradeStyleLabel(style: string | null | undefined): string {
  const found = TRADE_STYLE_OPTIONS.find((o) => o.value === style);
  return found ? found.label : '未設定';
}

/** 編集UI用：i18nキー（無い手法は undefined → label を使う） */
export function tradeStyleI18nKey(value: string): string | undefined {
  return TRADE_STYLE_OPTIONS.find((o) => o.value === value)?.i18nKey;
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
  currency: string | null;
  is_premium: boolean | null;
  plan_tier: 'free' | 'plus' | 'pro' | null;
  nationality: string | null;
  is_verified: boolean | null;
  monthly_pnl_goal: number | null;
  push_token: string | null;
  total_trades: number | null;
  website: string | null;
  twitter_handle: string | null;
  youtube: string | null;
  showcase_badges: string[] | null;
  showcase_stats: string[] | null;
  show_badges: boolean | null;
  referral_code: string | null;
  referred_by: string | null;
  bonus_premium_until: string | null;
  pip_unit: 'pips' | 'points' | null;
  banner_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * profiles テーブルのカラム一覧。
 * Supabase select で `select('*')` を避けるため共通的に使う。
 * Profile 型と一致させる。
 */
export const PROFILE_COLUMNS = `
  id, email, username, display_name, avatar_url, bio,
  trade_style, language, currency, is_premium, plan_tier, nationality, is_verified,
  monthly_pnl_goal, push_token, total_trades,
  website, twitter_handle, youtube, showcase_badges, showcase_stats, show_badges,
  referral_code, referred_by, bonus_premium_until, pip_unit, banner_url,
  created_at, updated_at
`;

// サポートする取引通貨。設定画面 → 通貨で選択し、profiles.currency に保存。
export const SUPPORTED_CURRENCIES = [
  { code: 'JPY', label: '日本円 (¥)', symbol: '¥', decimals: 0 },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$', decimals: 2 },
  { code: 'EUR', label: 'Euro (€)', symbol: '€', decimals: 2 },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£', decimals: 2 },
  { code: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$', decimals: 2 },
  { code: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$', decimals: 2 },
  { code: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF', decimals: 2 },
  { code: 'NZD', label: 'New Zealand Dollar (NZ$)', symbol: 'NZ$', decimals: 2 },
  { code: 'BRL', label: 'Brazilian Real (R$)', symbol: 'R$', decimals: 2 },
  { code: 'MXN', label: 'Mexican Peso (MX$)', symbol: 'MX$', decimals: 2 },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export function getCurrencyInfo(code: string | null | undefined) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ??
    SUPPORTED_CURRENCIES[0]
  );
}

export type Post = {
  id: string;
  user_id: string;
  trade_id: string | null;
  post_type: string;
  content: string | null;
  image_urls: string[] | null;
  video_urls: string[] | null;
  hashtags: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  parent_id: string | null;
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
  post_memo: string | null;
  review_memo: string | null;
  traded_at: string;
  is_shared: boolean;
  image_urls: string[] | null;
  tags: string[] | null;
  external_id: string | null;
  source: string | null;
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
  post_memo?: string | null;
  review_memo?: string | null;
  traded_at?: string;
  is_shared?: boolean;
  image_urls?: string[];
  tags?: string[];
  external_id?: string | null;
  source?: string;
};

// 記録フォームで提示する手法タグのプリセット（翻訳キー tags.<value>）
export const PRESET_TRADE_TAGS = [
  'breakout',
  'pullback',
  'trend',
  'range',
  'news',
  'scalp',
  'reversal',
] as const;

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
