import { useCallback, useEffect, useState } from 'react';

import { checkPremiumStatus } from '@/lib/iap';
import { isBonusPremiumActive, TEST_UNLOCK_PREMIUM } from '@/lib/premium';

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

  const bonusActive = isBonusPremiumActive(profile?.bonus_premium_until);
  const realPremium = dbPremium || profileFlag || bonusActive;

  return {
    // 機能の解放判定。テスト解放フラグが立っていれば全員解放。
    isPremium: realPremium || TEST_UNLOCK_PREMIUM,
    // 実際に課金しているか（表示の出し分け用）
    realPremium,
    // テスト解放で開いているだけの状態か（バナー/タグ表示用）
    testUnlock: TEST_UNLOCK_PREMIUM && !realPremium,
    loading,
    refresh,
  };
}
