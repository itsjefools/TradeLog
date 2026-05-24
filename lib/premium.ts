// Free / Premium プランの制限定義
// 課金は react-native-iap 経由 (lib/iap.ts)。Premium 判定は hooks/use-premium.ts が
// user_subscriptions テーブルの status='active' かつ expires_at 未来を見る

export const FREE_LIMITS = {
  monthlyTrades: 30,
  monthlyPosts: 5,
};

/**
 * ⚠️ テスト期間用フラグ ⚠️
 * true の間は、課金していなくても全プレミアム機能を解放する（審査・社内テスト用）。
 * 本番リリース前に必ず false に戻すこと。
 *
 * これが true でも、各プレミアム箇所には「PRO」タグやテスト解放バナーを表示するので、
 * どこが本来プレミアム機能かは画面上で分かるようにしてある。
 */
export const TEST_UNLOCK_PREMIUM = true;

export type Plan = 'free' | 'premium';

export function getPlan(isPremium: boolean | null | undefined): Plan {
  if (TEST_UNLOCK_PREMIUM) return 'premium';
  return isPremium ? 'premium' : 'free';
}

export function planLabel(plan: Plan): string {
  return plan === 'premium' ? 'Premium' : 'Free';
}
