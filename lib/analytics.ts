// アプリ全体のイベント計測ラッパー。
//
// 現状は no-op (開発時のみ console 出力)。Firebase Analytics を有効化するには:
//   1. Firebase Console で iOS/Android アプリを作成し
//      GoogleService-Info.plist と google-services.json をプロジェクトルートに配置
//   2. `npx expo install @react-native-firebase/app @react-native-firebase/analytics`
//   3. app.json に googleServicesFile と '@react-native-firebase/app' プラグインを追加
//   4. 下の `logEventImpl` 等を `@react-native-firebase/analytics` の呼び出しに差し替え
//   5. EAS Build で開発ビルドを作成 (Expo Go では動作しない)
//
// アプリ側の計測呼び出し (trackScreen / AnalyticsEvents.*) は全て本ファイル経由なので、
// 上記の差し替えだけで全イベントが有効化される。

type Params = Record<string, string | number | boolean | null | undefined>;

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function debugLog(kind: string, name: string, params?: Params) {
  if (DEV) {
    // eslint-disable-next-line no-console
    console.log(`[analytics:${kind}] ${name}`, params ?? {});
  }
}

export async function trackScreen(screenName: string) {
  debugLog('screen', screenName);
  // Firebase: await analytics().logScreenView({ screen_name, screen_class })
}

export async function trackEvent(eventName: string, params?: Params) {
  debugLog('event', eventName, params);
  // Firebase: await analytics().logEvent(eventName, params)
}

export async function setUserProperties(props: Record<string, string | null>) {
  debugLog('userProps', JSON.stringify(props));
  // Firebase: for (const [k, v] of Object.entries(props)) await analytics().setUserProperty(k, v)
}

export async function setAnalyticsUserId(userId: string | null) {
  debugLog('userId', String(userId));
  // Firebase: await analytics().setUserId(userId)
}

export const AnalyticsEvents = {
  // 認証
  signUp: (method: string) => trackEvent('sign_up', { method }),
  login: (method: string) => trackEvent('login', { method }),

  // 取引記録
  tradeRecorded: (pair: string, pnl: number) =>
    trackEvent('trade_recorded', { pair, pnl_positive: pnl > 0 }),

  // フィード
  postCreated: (hasImage: boolean, hasVideo: boolean) =>
    trackEvent('post_created', { has_image: hasImage, has_video: hasVideo }),
  postLiked: () => trackEvent('post_liked'),
  postCommented: () => trackEvent('post_commented'),

  // スクール
  lessonViewed: (lessonId: string, isFree: boolean) =>
    trackEvent('lesson_viewed', { lesson_id: lessonId, is_free: isFree }),
  lessonCompleted: (lessonId: string) =>
    trackEvent('lesson_completed', { lesson_id: lessonId }),

  // プレミアム
  paywallViewed: (source: string) => trackEvent('paywall_viewed', { source }),
  subscriptionStarted: (plan: string) =>
    trackEvent('subscription_started', { plan }),

  // 壁紙
  wallpaperCreated: () => trackEvent('wallpaper_created'),
  wallpaperDownloaded: () => trackEvent('wallpaper_downloaded'),

  // エクスポート
  csvExported: (period: string) => trackEvent('csv_exported', { period }),

  // エンゲージメント
  followUser: () => trackEvent('follow_user'),
  onboardingCompleted: () => trackEvent('onboarding_completed'),
  onboardingSkipped: (slideIndex: number) =>
    trackEvent('onboarding_skipped', { slide_index: slideIndex }),
};
