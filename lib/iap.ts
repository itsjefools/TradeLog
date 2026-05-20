import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
  type Product,
} from 'react-native-iap';

import { supabase } from './supabase';

// App Store / Google Play の商品ID
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: Platform.select({
    ios: 'com.kingjay.tradelog.premium.monthly',
    android: 'premium_monthly',
    default: 'premium_monthly',
  }),
  PREMIUM_YEARLY: Platform.select({
    ios: 'com.kingjay.tradelog.premium.yearly',
    android: 'premium_yearly',
    default: 'premium_yearly',
  }),
} as const;

const SKU_LIST: string[] = [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY];

let connected = false;

/**
 * IAP 接続を初期化。Expo Go では動作しないので失敗を握り潰す。
 */
export async function initIAP(): Promise<void> {
  if (connected) return;
  try {
    await initConnection();
    connected = true;
  } catch {
    connected = false;
  }
}

/**
 * IAP 接続を破棄。
 */
export async function endIAP(): Promise<void> {
  if (!connected) return;
  try {
    await endConnection();
  } catch {
    // ignore
  } finally {
    connected = false;
  }
}

/**
 * サブスクリプション商品情報を取得。
 * react-native-iap v15 では fetchProducts({ skus, type }) を使う。
 */
export async function getSubscriptionProducts(): Promise<Product[]> {
  try {
    const products = await fetchProducts({ skus: SKU_LIST, type: 'subs' });
    return (products ?? []) as Product[];
  } catch {
    return [];
  }
}

/**
 * サブスクリプション購入をリクエスト。
 * 結果は purchaseUpdatedListener / purchaseErrorListener で受け取る (非同期イベント駆動)。
 */
export async function purchaseSubscription(productId: string): Promise<void> {
  try {
    await requestPurchase({
      request: {
        ios: { sku: productId },
        android: {
          skus: [productId],
        },
      },
      type: 'subs',
    });
  } catch {
    // エラーは purchaseErrorListener が拾うので、ここでは何もしない
  }
}

function defaultExpiresAt(productId: string): string {
  const ms =
    productId.includes('yearly') || productId.includes('annual')
      ? 365 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

function purchaseToken(purchase: Purchase): string | null {
  const anyP = purchase as unknown as Record<string, unknown>;
  const candidates = [
    'purchaseToken',
    'transactionReceipt',
    'jwsRepresentationIOS',
    'transactionId',
    'id',
  ];
  for (const key of candidates) {
    const v = anyP[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function platformOf(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

/**
 * 購入イベントを購読し、成功時に user_subscriptions に保存する。
 * 戻り値はクリーンアップ関数。
 */
export function setupPurchaseListeners(
  userId: string,
  onSuccess: () => void,
  onError: (errorCode: string) => void,
): () => void {
  const purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
    try {
      const platform = platformOf();
      if (!platform) return;

      const productId = (purchase as { productId?: string }).productId;
      if (!productId) {
        onError('invalid_purchase');
        return;
      }

      await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            product_id: productId,
            purchase_token: purchaseToken(purchase),
            platform,
            status: 'active',
            expires_at: defaultExpiresAt(productId),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,product_id' },
        );

      // is_premium フラグを true に同期 (UI 即時反映用)
      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', userId);

      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // finish 失敗は致命的ではない
      }

      onSuccess();
    } catch {
      onError('purchase_processing_failed');
    }
  });

  const errorSub = purchaseErrorListener((error) => {
    const code = (error as { code?: string }).code ?? 'purchase_failed';
    if (code === 'E_USER_CANCELLED') return;
    onError(code);
  });

  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
}

/**
 * Supabase 上の購読レコードを参照して Premium 判定。
 * status='active' かつ expires_at が未来であれば Premium。
 */
export async function checkPremiumStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
