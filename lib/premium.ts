// Free / Plus / Pro プランの制限・機能定義
// 課金は react-native-iap 経由 (lib/iap.ts)。プラン判定は hooks/use-premium.ts が
// user_subscriptions テーブル (status='active' かつ expires_at 未来) と profiles.plan_tier を見る。

/**
 * ⚠️ テスト期間用フラグ ⚠️
 * true の間は、課金していなくても全機能 (Pro 相当) を解放する（審査・社内テスト用）。
 * 本番リリース前に必ず false に戻すこと。
 *
 * これが true でも、各有料箇所には「Plus/Pro」タグやテスト解放バナーを表示するので、
 * どこが本来有料機能かは画面上で分かるようにしてある。
 */
export const TEST_UNLOCK_PREMIUM = false;

export type Plan = 'free' | 'plus' | 'pro';

/** プランの階層ランク（比較用）。free < plus < pro */
export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

/** plan が required 以上のティアか */
export function planAtLeast(plan: Plan, required: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[required];
}

/** 各プランの利用制限。monthlyTrades は記録できる月間件数 (Infinity=無制限)。投稿は全プラン無制限。 */
export const PLAN_LIMITS: Record<Plan, { monthlyTrades: number }> = {
  free: { monthlyTrades: 15 },
  plus: { monthlyTrades: 30 },
  pro: { monthlyTrades: Infinity },
};

/** 機能ごとに必要な最低ティア。ゲート箇所はここを参照する。 */
export const FEATURE_TIER = {
  analytics: 'plus', // 高度分析 (最大DD/見通し/タグ別/ヒートマップ/週次)
  lessons_full: 'plus', // 全レッスン + FX事典フル
  wallpaper: 'plus', // 壁紙
  no_ads: 'plus', // 広告非表示
  export_pdf: 'pro', // PDF エクスポート (CSV は全プラン無料)
  share_card: 'pro', // 成績シェア
  ai_review: 'pro', // AI レビュー
  custom_kpi: 'pro', // カスタム KPI
  badges: 'pro', // カスタムバッジ
  community: 'pro', // コミュニティ作成
} as const satisfies Record<string, Plan>;

export type FeatureKey = keyof typeof FEATURE_TIER;

/** 招待リワード等で付与された bonus_premium_until が有効か */
export function isBonusPremiumActive(bonusUntil?: string | null): boolean {
  return !!bonusUntil && new Date(bonusUntil).getTime() > Date.now();
}

/**
 * 現在のプランを判定する。
 * - TEST_UNLOCK_PREMIUM が true なら全員 'pro'。
 * - 招待ボーナスが有効なら最低 'pro'（リワードは Pro 付与）。
 * - それ以外は plan_tier (購入ティア) をそのまま使う。
 */
export function getPlan(
  planTier: Plan | string | null | undefined,
  bonusUntil?: string | null,
): Plan {
  if (TEST_UNLOCK_PREMIUM) return 'pro';
  if (isBonusPremiumActive(bonusUntil)) return 'pro';
  if (planTier === 'plus' || planTier === 'pro') return planTier;
  return 'free';
}

/** 指定機能がそのプランで使えるか */
export function canUseFeature(plan: Plan, feature: FeatureKey): boolean {
  return planAtLeast(plan, FEATURE_TIER[feature]);
}

export function planLabel(plan: Plan): string {
  if (plan === 'pro') return 'Pro';
  if (plan === 'plus') return 'Plus';
  return 'Free';
}
