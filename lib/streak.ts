import { Trade } from './types';

/**
 * 連続記録日数(ストリーク)を計算する。
 *
 * 「今日または昨日から連続して、取引が1件以上ある日数」を返す。
 * - 今日に記録があれば今日を起点に過去へ遡る。
 * - 今日に記録がなく昨日にあれば昨日を起点に過去へ遡る。
 * - 今日も昨日も記録がなければ 0。
 *
 * 日付の境界はローカルタイムで判定する。
 */
export function computeStreak(trades: Trade[]): number {
  if (!trades || trades.length === 0) return 0;

  // traded_at をローカル日付キー(YYYY-MM-DD)の集合にまとめる
  const dayKeys = new Set<string>();
  for (const trade of trades) {
    if (!trade?.traded_at) continue;
    const d = new Date(trade.traded_at);
    if (Number.isNaN(d.getTime())) continue;
    dayKeys.add(localDayKey(d));
  }
  if (dayKeys.size === 0) return 0;

  const today = new Date();
  const todayKey = localDayKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);

  // 起点を決める: 今日に記録があれば今日、なければ昨日、どちらも無ければ 0。
  let cursor: Date;
  if (dayKeys.has(todayKey)) {
    cursor = startOfDay(today);
  } else if (dayKeys.has(yesterdayKey)) {
    cursor = startOfDay(yesterday);
  } else {
    return 0;
  }

  // 起点から1日ずつ遡り、記録がある限りカウントする。
  let streak = 0;
  while (dayKeys.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
