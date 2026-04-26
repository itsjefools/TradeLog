// RevenueCat 設定
//
// API キー: ダッシュボード（https://app.revenuecat.com/）の Project Settings > Apps
// から iOS / Android それぞれの "Public" key（appl_xxx / goog_xxx）を取得
// 環境変数で渡す（EXPO_PUBLIC_ プレフィックスでクライアントから読める）
//
// 商品 ID: App Store Connect / Google Play Console で登録した SKU と
// RevenueCat ダッシュボードの Products / Offerings を一致させる

export const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '';
export const RC_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '';

// RevenueCat ダッシュボードで作成する Entitlement の identifier
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// RevenueCat の Offering identifier（既定の "default" を使う想定）
export const DEFAULT_OFFERING_ID = 'default';
