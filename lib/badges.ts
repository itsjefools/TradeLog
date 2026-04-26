// 称号（バッジ）システム
// 取引数・連勝・勝率・利益などから称号を計算

import { Trade } from './types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type Badge = {
  id: string;
  label: string;
  description: string;
  tier: BadgeTier;
  emoji: string;
};

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#B45309',
  silver: '#9CA3AF',
  gold: '#F59E0B',
  platinum: '#06B6D4',
  diamond: '#A78BFA',
};

export function tierColor(tier: BadgeTier): string {
  return TIER_COLORS[tier];
}

const COUNT_TIERS: { count: number; tier: BadgeTier; emoji: string }[] = [
  { count: 1000, tier: 'diamond', emoji: '💎' },
  { count: 500, tier: 'platinum', emoji: '🪐' },
  { count: 100, tier: 'gold', emoji: '🥇' },
  { count: 50, tier: 'silver', emoji: '🥈' },
  { count: 10, tier: 'bronze', emoji: '🥉' },
];

const STREAK_TIERS: { streak: number; tier: BadgeTier; emoji: string }[] = [
  { streak: 20, tier: 'diamond', emoji: '🔥' },
  { streak: 10, tier: 'gold', emoji: '🔥' },
  { streak: 5, tier: 'silver', emoji: '🔥' },
];

export function computeBadges(trades: Trade[]): Badge[] {
  const badges: Badge[] = [];

  // 取引数バッジ
  const countTier = COUNT_TIERS.find((t) => trades.length >= t.count);
  if (countTier) {
    badges.push({
      id: `count_${countTier.tier}`,
      label: `${countTier.count}+ 取引`,
      description: `累計 ${countTier.count} 取引以上を達成`,
      tier: countTier.tier,
      emoji: countTier.emoji,
    });
  }

  // 連勝バッジ（traded_at 順、勝ち=win, 負け=loss でリセット）
  const sorted = [...trades]
    .filter((t) => t.result !== null)
    .sort(
      (a, b) =>
        new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
    );
  let maxStreak = 0;
  let cur = 0;
  for (const t of sorted) {
    if (t.result === 'win') {
      cur++;
      if (cur > maxStreak) maxStreak = cur;
    } else if (t.result === 'loss') {
      cur = 0;
    }
  }
  const streakTier = STREAK_TIERS.find((t) => maxStreak >= t.streak);
  if (streakTier) {
    badges.push({
      id: `streak_${streakTier.tier}`,
      label: `${streakTier.streak}連勝`,
      description: `${streakTier.streak}回連続で利確を達成`,
      tier: streakTier.tier,
      emoji: streakTier.emoji,
    });
  }

  // 勝率バッジ（10取引以上で評価）
  const withResult = trades.filter((t) => t.result !== null);
  if (withResult.length >= 10) {
    const wins = withResult.filter((t) => t.result === 'win').length;
    const winRate = wins / withResult.length;
    if (winRate >= 0.7) {
      badges.push({
        id: 'winrate_diamond',
        label: '勝率70%+',
        description: '最低10取引で勝率70%以上',
        tier: 'diamond',
        emoji: '🎯',
      });
    } else if (winRate >= 0.6) {
      badges.push({
        id: 'winrate_gold',
        label: '勝率60%+',
        description: '最低10取引で勝率60%以上',
        tier: 'gold',
        emoji: '🎯',
      });
    } else if (winRate >= 0.5) {
      badges.push({
        id: 'winrate_silver',
        label: '勝率50%+',
        description: '最低10取引で勝率50%以上',
        tier: 'silver',
        emoji: '🎯',
      });
    }
  }

  // 累計利益バッジ
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  if (totalPnl >= 1_000_000) {
    badges.push({
      id: 'pnl_diamond',
      label: '+100万円達成',
      description: '累計利益100万円以上',
      tier: 'diamond',
      emoji: '💰',
    });
  } else if (totalPnl >= 500_000) {
    badges.push({
      id: 'pnl_gold',
      label: '+50万円達成',
      description: '累計利益50万円以上',
      tier: 'gold',
      emoji: '💰',
    });
  } else if (totalPnl >= 100_000) {
    badges.push({
      id: 'pnl_silver',
      label: '+10万円達成',
      description: '累計利益10万円以上',
      tier: 'silver',
      emoji: '💰',
    });
  } else if (totalPnl >= 10_000) {
    badges.push({
      id: 'pnl_bronze',
      label: '+1万円達成',
      description: '累計利益1万円以上',
      tier: 'bronze',
      emoji: '💰',
    });
  }

  return badges;
}
