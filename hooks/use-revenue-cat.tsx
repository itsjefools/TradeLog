import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  PREMIUM_ENTITLEMENT_ID,
  RC_API_KEY_ANDROID,
  RC_API_KEY_IOS,
} from '@/lib/revenue-cat';
import { supabase } from '@/lib/supabase';

import { useAuth } from './use-auth';
import { useProfile } from './use-profile';

type RCContext = {
  ready: boolean;
  configured: boolean;
  isPremium: boolean;
  offering: PurchasesOffering | null;
  refreshing: boolean;
  purchasing: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const RevenueCatContext = createContext<RCContext>({
  ready: false,
  configured: false,
  isPremium: false,
  offering: null,
  refreshing: false,
  purchasing: false,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => undefined,
});

function pickApiKey(): string | null {
  if (Platform.OS === 'ios') return RC_API_KEY_IOS || null;
  if (Platform.OS === 'android') return RC_API_KEY_ANDROID || null;
  return null;
}

function entitlementActive(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { profile, updateProfile } = useProfile();
  const userId = session?.user.id ?? null;

  const [configured, setConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const lastSyncedRef = useRef<boolean | null>(null);

  // 1. SDK 初期化（API キーがある時だけ configure）
  useEffect(() => {
    const apiKey = pickApiKey();
    if (!apiKey) {
      setConfigured(false);
      setReady(true);
      return;
    }
    try {
      Purchases.configure({ apiKey });
      setConfigured(true);
    } catch {
      setConfigured(false);
    }
    setReady(true);
  }, []);

  // 2. Supabase ユーザーと RevenueCat ID を同期
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        if (userId) {
          await Purchases.logIn(userId);
        } else {
          await Purchases.logOut();
        }
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setIsPremium(entitlementActive(info));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, userId]);

  // 3. CustomerInfo の変化を購読
  useEffect(() => {
    if (!configured) return;
    const listener = (info: CustomerInfo) => {
      setIsPremium(entitlementActive(info));
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [configured]);

  // 4. Offering の取得
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (!cancelled) setOffering(offerings.current ?? null);
      } catch {
        if (!cancelled) setOffering(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  // 5. is_premium が RC と乖離していたら Supabase に同期 + 監査ログ
  useEffect(() => {
    if (!userId || !ready) return;
    if (lastSyncedRef.current === isPremium) return;

    const profileFlag = profile?.is_premium ?? false;
    if (profileFlag !== isPremium) {
      updateProfile({ is_premium: isPremium }).catch(() => undefined);
    }
    lastSyncedRef.current = isPremium;
  }, [isPremium, userId, ready, profile?.is_premium, updateProfile]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      if (!configured) return false;
      setPurchasing(true);
      try {
        const result = await Purchases.purchasePackage(pkg);
        const active = entitlementActive(result.customerInfo);
        setIsPremium(active);
        if (active && userId) {
          // 監査ログ（任意）。失敗しても購入自体は成功扱い
          supabase
            .from('purchases_log')
            .insert({
              user_id: userId,
              product_id: pkg.product.identifier,
              transaction_id:
                result.customerInfo.originalAppUserId ?? null,
              platform: Platform.OS,
              raw: result.customerInfo as unknown as object,
            })
            .then(() => undefined, () => undefined);
        }
        return active;
      } catch (e) {
        const err = e as { userCancelled?: boolean };
        if (!err?.userCancelled) {
          throw e;
        }
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [configured, userId],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!configured) return false;
    setRefreshing(true);
    try {
      const info = await Purchases.restorePurchases();
      const active = entitlementActive(info);
      setIsPremium(active);
      return active;
    } finally {
      setRefreshing(false);
    }
  }, [configured]);

  const refresh = useCallback(async () => {
    if (!configured) return;
    setRefreshing(true);
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPremium(entitlementActive(info));
      const offerings = await Purchases.getOfferings();
      setOffering(offerings.current ?? null);
    } finally {
      setRefreshing(false);
    }
  }, [configured]);

  return (
    <RevenueCatContext.Provider
      value={{
        ready,
        configured,
        isPremium,
        offering,
        refreshing,
        purchasing,
        purchase,
        restore,
        refresh,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}
