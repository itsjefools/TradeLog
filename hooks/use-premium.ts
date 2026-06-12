import { useCallback, useEffect, useState } from 'react';

import { getActiveTier } from '@/lib/iap';
import {
  getPlan,
  planAtLeast,
  TEST_UNLOCK_PREMIUM,
  type Plan,
} from '@/lib/premium';

import { useAuth } from './use-auth';
import { useProfile } from './use-profile';

/**
 * プラン状態 (free / plus / pro) を Supabase の user_subscriptions テーブル経由で判定する。
 * profiles.plan_tier も補助的に参照 (即時更新のため)、招待ボーナス (bonus_premium_until) も加味する。
 */
export function usePremium() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const userId = session?.user.id ?? null;
  const profileTier = (profile?.plan_tier as Plan | undefined) ?? 'free';

  const [dbTier, setDbTier] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDbTier('free');
      setLoading(false);
      return;
    }
    try {
      const tier = await getActiveTier(userId);
      setDbTier(tier);
    } catch {
      setDbTier('free');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // DB 購読 / profile 即時フラグ のうち上位ティアを採用し、ボーナス・テスト解放を getPlan で合算
  const baseTier: Plan = planAtLeast(dbTier, profileTier) ? dbTier : profileTier;
  const plan = getPlan(baseTier, profile?.bonus_premium_until);

  // テスト解放やボーナスを除いた「実際に課金しているティア」
  const realPlan = getPlan(baseTier, null);
  const realPaid = realPlan !== 'free';

  return {
    /** 現在の有効プラン (free / plus / pro)。テスト解放・ボーナス込み。 */
    plan,
    /** Plus 以上か */
    isPlus: planAtLeast(plan, 'plus'),
    /** Pro か */
    isPro: plan === 'pro',
    /** 後方互換: Plus 以上を Premium とみなす */
    isPremium: planAtLeast(plan, 'plus'),
    /** 実際に課金しているか（表示の出し分け用） */
    realPremium: realPaid,
    /** テスト解放で開いているだけの状態か（バナー/タグ表示用） */
    testUnlock: TEST_UNLOCK_PREMIUM && !realPaid,
    loading,
    refresh,
  };
}
