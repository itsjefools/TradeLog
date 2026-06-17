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
import { PLAN_RANK, type Plan } from './premium';

// App Store / Google Play の商品ID (Plus / Pro × 月額 / 年額)
export const PRODUCT_IDS = {
  PLUS_MONTHLY: Platform.select({
    ios: 'com.kingjay.tradelog.plus.monthly',
    android: 'plus_monthly',
    default: 'plus_monthly',
  }),
  PLUS_YEARLY: Platform.select({
    ios: 'com.kingjay.tradelog.plus.yearly',
    android: 'plus_yearly',
    default: 'plus_yearly',
  }),
  PRO_MONTHLY: Platform.select({
    ios: 'com.kingjay.tradelog.pro.monthly',
    android: 'pro_monthly',
    default: 'pro_monthly',
  }),
  PRO_YEARLY: Platform.select({
    ios: 'com.kingjay.tradelog.pro.yearly',
    android: 'pro_yearly',
    default: 'pro_yearly',
  }),
} as const;

// 有料コミュニティの価格ティアに対応する商品ID（自動更新サブスク）。
// 同じ商品でも「どのコミュニティの課金か」は購入時に pendingCommunityId で保持する。
export const COMMUNITY_PRODUCT_IDS: Record<string, string> = {
  tier_480: Platform.select({
    ios: 'com.kingjay.tradelog.community.480',
    android: 'community_480',
    default: 'community_480',
  }),
  tier_980: Platform.select({
    ios: 'com.kingjay.tradelog.community.980',
    android: 'community_980',
    default: 'community_980',
  }),
  tier_1980: Platform.select({
    ios: 'com.kingjay.tradelog.community.1980',
    android: 'community_1980',
    default: 'community_1980',
  }),
  tier_2980: Platform.select({
    ios: 'com.kingjay.tradelog.community.2980',
    android: 'community_2980',
    default: 'community_2980',
  }),
};

const SKU_LIST: string[] = [
  PRODUCT_IDS.PLUS_MONTHLY,
  PRODUCT_IDS.PLUS_YEARLY,
  PRODUCT_IDS.PRO_MONTHLY,
  PRODUCT_IDS.PRO_YEARLY,
  ...Object.values(COMMUNITY_PRODUCT_IDS),
];

/** コミュニティ課金の商品か */
export function isCommunityProduct(productId: string | null | undefined): boolean {
  return !!productId && productId.includes('community');
}

// 「今どのコミュニティを購入しようとしているか」を購入フロー中だけ保持する。
let pendingCommunityId: string | null = null;

/** 商品IDから購入ティアを判定する。'pro' を含めば pro、'plus' を含めば plus。 */
export function tierForProduct(productId: string | null | undefined): Plan {
  if (!productId) return 'free';
  if (productId.includes('pro')) return 'pro';
  if (productId.includes('plus')) return 'plus';
  return 'free';
}

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

/**
 * 有料コミュニティの購入をリクエストする。
 * 購入結果は setupPurchaseListeners が拾い、community-subscribe-verify を呼んで
 * 記帳＋参加権付与を行う。tierKey は community_price_tiers のキー。
 */
export async function purchaseCommunitySubscription(
  communityId: string,
  tierKey: string,
): Promise<void> {
  const productId = COMMUNITY_PRODUCT_IDS[tierKey];
  if (!productId) return;
  pendingCommunityId = communityId;
  try {
    await requestPurchase({
      request: { ios: { sku: productId }, android: { skus: [productId] } },
      type: 'subs',
    });
  } catch {
    pendingCommunityId = null;
    // エラーは purchaseErrorListener が拾う
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

      // --- 有料コミュニティの購入: 検証Edge Functionで記帳＋参加権付与 ---
      if (isCommunityProduct(productId)) {
        const communityId = pendingCommunityId;
        pendingCommunityId = null;
        if (communityId) {
          const token = purchaseToken(purchase);
          await supabase.functions.invoke('community-subscribe-verify', {
            body: {
              communityId,
              platform,
              productId,
              transactionId: token,
              purchaseToken: token,
            },
          });
        }
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {
          // ignore
        }
        onSuccess();
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

      // plan_tier / is_premium を購入ティアで同期 (UI 即時反映用)
      const tier = tierForProduct(productId);
      await supabase
        .from('profiles')
        .update({ plan_tier: tier, is_premium: tier !== 'free' })
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
 * Supabase 上の購読レコードを参照して現在のティアを判定する。
 * status='active' かつ expires_at が未来の購読のうち、最上位ティアを返す。
 * 無効/該当なしなら 'free'。
 */
export async function getActiveTier(userId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('product_id, status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString());

  if (error || !data || data.length === 0) return 'free';

  // 複数 active があれば最上位ティアを採用
  let best: Plan = 'free';
  for (const row of data) {
    const tier = tierForProduct((row as { product_id?: string }).product_id);
    if (PLAN_RANK[tier] > PLAN_RANK[best]) best = tier;
  }
  return best;
}
