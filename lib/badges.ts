// 称号（バッジ）システム
// 取引数・連勝・勝率・利益などから称号を計算する。
// ラベル/説明は i18n キー + パラメータで返す（表示側で t() する）。

import { formatPnlWithCurrency } from './format-currency';
import { Trade } from './types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type Badge = {
  id: string;
  tier: BadgeTier;
  emoji: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  descKey: string;
  descParams?: Record<string, string | number>;
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

const PNL_TIERS: { amount: number; tier: BadgeTier }[] = [
  { amount: 1_000_000, tier: 'diamond' },
  { amount: 500_000, tier: 'platinum' },
  { amount: 100_000, tier: 'gold' },
  { amount: 10_000, tier: 'bronze' },
];

export function computeBadges(
  trades: Trade[],
  currency?: string | null,
): Badge[] {
  const badges: Badge[] = [];

  // 初トレード（最初の一歩）
  if (trades.length >= 1) {
    badges.push({
      id: 'first',
      tier: 'bronze',
      emoji: '🌱',
      labelKey: 'badges.first',
      descKey: 'badges.first_desc',
    });
  }

  // 取引数バッジ
  const countTier = COUNT_TIERS.find((t) => trades.length >= t.count);
  if (countTier) {
    badges.push({
      id: `count_${countTier.tier}`,
      tier: countTier.tier,
      emoji: countTier.emoji,
      labelKey: 'badges.count',
      labelParams: { count: countTier.count },
      descKey: 'badges.count_desc',
      descParams: { count: countTier.count },
    });
  }

  // 連勝バッジ（traded_at 順、勝ち=win で加算、負け=loss でリセット）
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
      tier: streakTier.tier,
      emoji: streakTier.emoji,
      labelKey: 'badges.streak',
      labelParams: { count: streakTier.streak },
      descKey: 'badges.streak_desc',
      descParams: { count: streakTier.streak },
    });
  }

  // 勝率バッジ（10取引以上で評価）
  const withResult = trades.filter((t) => t.result !== null);
  if (withResult.length >= 10) {
    const wins = withResult.filter((t) => t.result === 'win').length;
    const winRate = wins / withResult.length;
    const rateTier =
      winRate >= 0.7
        ? { tier: 'diamond' as BadgeTier, rate: 70 }
        : winRate >= 0.6
          ? { tier: 'gold' as BadgeTier, rate: 60 }
          : winRate >= 0.5
            ? { tier: 'silver' as BadgeTier, rate: 50 }
            : null;
    if (rateTier) {
      badges.push({
        id: `winrate_${rateTier.tier}`,
        tier: rateTier.tier,
        emoji: '🎯',
        labelKey: 'badges.winrate',
        labelParams: { rate: rateTier.rate },
        descKey: 'badges.winrate_desc',
        descParams: { rate: rateTier.rate },
      });
    }
  }

  // 累計利益バッジ（口座通貨で表示）
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const pnlTier = PNL_TIERS.find((t) => totalPnl >= t.amount);
  if (pnlTier) {
    const amount = formatPnlWithCurrency(pnlTier.amount, currency);
    badges.push({
      id: `pnl_${pnlTier.tier}`,
      tier: pnlTier.tier,
      emoji: '💰',
      labelKey: 'badges.pnl',
      labelParams: { amount },
      descKey: 'badges.pnl_desc',
      descParams: { amount },
    });
  }

  return badges;
}
