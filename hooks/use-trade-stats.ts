import { useMemo } from 'react';

import { Trade } from '@/lib/types';

import { useTrades } from './use-trades';

export type StatsPeriod = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

export type TradeStats = {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  totalPips: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxWin: number;
  maxLoss: number;
  maxDrawdown: number;
  winStreak: number;
  loseStreak: number;
  byPair: { pair: string; trades: number; pnl: number; winRate: number }[];
  byTag: { tag: string; trades: number; pnl: number; winRate: number }[];
  pnlCurve: { date: string; cumulative: number }[];
};

const EMPTY_STATS: TradeStats = {
  totalTrades: 0,
  winRate: 0,
  totalPnl: 0,
  totalPips: 0,
  avgPnl: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: 0,
  maxWin: 0,
  maxLoss: 0,
  maxDrawdown: 0,
  winStreak: 0,
  loseStreak: 0,
  byPair: [],
  byTag: [],
  pnlCurve: [],
};

const PERIOD_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

function periodStart(period: StatsPeriod): Date | null {
  if (period === 'all') return null;
  const since = new Date();
  since.setDate(since.getDate() - PERIOD_DAYS[period]);
  return since;
}

/**
 * 取引統計を期間でフィルタして集計する。
 * TradesProvider の全取引を使い回すので追加の取得は発生しない。
 */
export function useTradeStats(period: StatsPeriod = 'all') {
  const { trades, loading, refresh } = useTrades();

  const stats = useMemo<TradeStats>(() => {
    const since = periodStart(period);
    // 損益が記録済みの取引のみを集計対象にし、約定日時の昇順に並べる
    const list = trades
      .filter((t) => t.pnl !== null)
      .filter((t) => (since ? new Date(t.traded_at) >= since : true))
      .sort(
        (a, b) =>
          new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
      );

    if (list.length === 0) return EMPTY_STATS;

    const pnlOf = (t: Trade) => t.pnl ?? 0;
    const wins = list.filter((t) => pnlOf(t) > 0);
    const losses = list.filter((t) => pnlOf(t) < 0);
    const totalPnl = list.reduce((s, t) => s + pnlOf(t), 0);
    const totalPips = list.reduce((s, t) => s + (t.pnl_pips ?? 0), 0);
    const totalWin = wins.reduce((s, t) => s + pnlOf(t), 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + pnlOf(t), 0));

    // 連勝・連敗
    let maxWinStreak = 0;
    let maxLoseStreak = 0;
    let curStreak = 0;
    let curType: 'win' | 'loss' | '' = '';
    for (const t of list) {
      const type = pnlOf(t) > 0 ? 'win' : pnlOf(t) < 0 ? 'loss' : '';
      if (type === '') continue;
      if (type === curType) curStreak += 1;
      else {
        curStreak = 1;
        curType = type;
      }
      if (type === 'win') maxWinStreak = Math.max(maxWinStreak, curStreak);
      else maxLoseStreak = Math.max(maxLoseStreak, curStreak);
    }

    // 通貨ペア別
    const pairMap = new Map<
      string,
      { trades: number; pnl: number; wins: number }
    >();
    for (const t of list) {
      const cur = pairMap.get(t.currency_pair) ?? { trades: 0, pnl: 0, wins: 0 };
      cur.trades += 1;
      cur.pnl += pnlOf(t);
      if (pnlOf(t) > 0) cur.wins += 1;
      pairMap.set(t.currency_pair, cur);
    }

    // タグ（手法）別。trade.tags(配列)を展開して集計する
    const tagMap = new Map<
      string,
      { trades: number; pnl: number; wins: number }
    >();
    for (const t of list) {
      for (const rawTag of t.tags ?? []) {
        const tag = rawTag.trim();
        if (!tag) continue;
        const cur = tagMap.get(tag) ?? { trades: 0, pnl: 0, wins: 0 };
        cur.trades += 1;
        cur.pnl += pnlOf(t);
        if (pnlOf(t) > 0) cur.wins += 1;
        tagMap.set(tag, cur);
      }
    }

    // 累積損益カーブ
    let cumulative = 0;
    const pnlCurve = list.map((t) => {
      cumulative += pnlOf(t);
      return { date: t.traded_at.slice(0, 10), cumulative };
    });

    // 最大ドローダウン: 累積エクイティのピークからの最大下落幅
    let peak = 0;
    let maxDrawdown = 0;
    for (const p of pnlCurve) {
      if (p.cumulative > peak) peak = p.cumulative;
      const dd = peak - p.cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      totalTrades: list.length,
      winRate: (wins.length / list.length) * 100,
      totalPnl,
      totalPips,
      avgPnl: totalPnl / list.length,
      avgWin: wins.length > 0 ? totalWin / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
      profitFactor:
        totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
      maxWin: wins.length > 0 ? Math.max(...wins.map(pnlOf)) : 0,
      maxLoss: losses.length > 0 ? Math.min(...losses.map(pnlOf)) : 0,
      maxDrawdown,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak,
      byPair: Array.from(pairMap.entries())
        .map(([pair, d]) => ({
          pair,
          trades: d.trades,
          pnl: d.pnl,
          winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
        }))
        .sort((a, b) => b.trades - a.trades),
      byTag: Array.from(tagMap.entries())
        .map(([tag, d]) => ({
          tag,
          trades: d.trades,
          pnl: d.pnl,
          winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
        }))
        .sort((a, b) => b.trades - a.trades),
      pnlCurve,
    };
  }, [trades, period]);

  return { stats, loading, refresh };
}
