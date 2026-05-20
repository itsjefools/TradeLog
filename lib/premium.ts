// Free / Premium プランの制限定義
// 課金は react-native-iap 経由 (lib/iap.ts)。Premium 判定は hooks/use-premium.ts が
// user_subscriptions テーブルの status='active' かつ expires_at 未来を見る

export const FREE_LIMITS = {
  monthlyTrades: 30,
  monthlyPosts: 5,
};

export type Plan = 'free' | 'premium';

export function getPlan(isPremium: boolean | null | undefined): Plan {
  return isPremium ? 'premium' : 'free';
}

export function planLabel(plan: Plan): string {
  return plan === 'premium' ? 'Premium' : 'Free';
}

export const PREMIUM_FEATURES = [
  '取引記録の無制限化（Free は月30件まで）',
  '投稿数の無制限化（Free は月5件まで）',
  '高度な分析（複数月比較・カスタムKPI）',
  'CSVエクスポート',
  '広告なしの体験',
  'Premium バッジ',
];
