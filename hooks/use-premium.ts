import { useCallback, useEffect, useState } from 'react';

import { checkPremiumStatus } from '@/lib/iap';

import { useAuth } from './use-auth';
import { useProfile } from './use-profile';

/**
 * Premium 状態を Supabase の user_subscriptions テーブル経由で判定する。
 * profiles.is_premium も補助的に参照 (即時更新のため)。
 */
export function usePremium() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const userId = session?.user.id ?? null;
  const profileFlag = profile?.is_premium ?? false;

  const [dbPremium, setDbPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDbPremium(false);
      setLoading(false);
      return;
    }
    try {
      const status = await checkPremiumStatus(userId);
      setDbPremium(status);
    } catch {
      setDbPremium(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPremium: dbPremium || profileFlag,
    loading,
    refresh,
  };
}
