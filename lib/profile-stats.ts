import { formatPnlCompact } from '@/lib/format-currency';
import { Trade } from '@/lib/types';

/** プロフィールに表示できる成績指標。trades から算出する。 */
export type StatKey =
  | 'win_rate'
  | 'streak'
  | 'max_streak'
  | 'cumulative_pnl'
  | 'trade_count'
  | 'avg_rr'
  | 'profit_factor'
  | 'month_pnl'
  | 'best_pair'
  | 'avg_pips';

export const MAX_SHOWCASE_STATS = 3;
export const DEFAULT_SHOWCASE_STATS: StatKey[] = [
  'win_rate',
  'streak',
  'cumulative_pnl',
];

/** 編集画面の候補表示順。 */
export const STAT_KEYS: StatKey[] = [
  'win_rate',
  'streak',
  'max_streak',
  'cumulative_pnl',
  'trade_count',
  'avg_rr',
  'profit_factor',
  'month_pnl',
  'best_pair',
  'avg_pips',
];

export const STAT_LABEL_KEY: Record<StatKey, string> = {
  win_rate: 'profile.stat_win_rate',
  streak: 'profile.stat_streak',
  max_streak: 'profile.stat_max_streak',
  cumulative_pnl: 'profile.stat_cumulative_pnl',
  trade_count: 'profile.stat_trade_count',
  avg_rr: 'profile.stat_avg_rr',
  profit_factor: 'profile.stat_profit_factor',
  month_pnl: 'profile.stat_month_pnl',
  best_pair: 'profile.stat_best_pair',
  avg_pips: 'profile.stat_avg_pips',
};

export type StatTone = 'pos' | 'neg' | 'neutral';
export type StatValue = { value: string; tone: StatTone };

function toneBySign(n: number): StatTone {
  if (n > 0) return 'pos';
  if (n < 0) return 'neg';
  return 'neutral';
}

function resolved(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.result === 'win' || t.result === 'loss');
}

const DASH: StatValue = { value: '—', tone: 'neutral' };

/** 指標1つの表示値を算出。データが無い場合は「—」。 */
export function computeStat(
  key: StatKey,
  trades: Trade[],
  currency: string | null | undefined,
): StatValue {
  switch (key) {
    case 'win_rate': {
      const r = resolved(trades);
      if (r.length === 0) return DASH;
      const wins = r.filter((t) => t.result === 'win').length;
      return { value: `${Math.round((wins / r.length) * 100)}%`, tone: 'neutral' };
    }
    case 'streak': {
      const r = [...resolved(trades)].sort(
        (a, b) =>
          new Date(b.traded_at).getTime() - new Date(a.traded_at).getTime(),
      );
      let n = 0;
      for (const t of r) {
        if (t.result === 'win') n++;
        else break;
      }
      return { value: String(n), tone: n > 0 ? 'pos' : 'neutral' };
    }
    case 'max_streak': {
      const r = [...resolved(trades)].sort(
        (a, b) =>
          new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
      );
      let best = 0;
      let cur = 0;
      for (const t of r) {
        if (t.result === 'win') {
          cur++;
          best = Math.max(best, cur);
        } else {
          cur = 0;
        }
      }
      return { value: String(best), tone: best > 0 ? 'pos' : 'neutral' };
    }
    case 'cumulative_pnl': {
      if (trades.length === 0) return DASH;
      const sum = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
      return { value: formatPnlCompact(sum, currency), tone: toneBySign(sum) };
    }
    case 'trade_count':
      return { value: String(trades.length), tone: 'neutral' };
    case 'avg_rr': {
      const wins = trades.filter((t) => t.result === 'win' && t.pnl != null);
      const losses = trades.filter((t) => t.result === 'loss' && t.pnl != null);
      if (wins.length === 0 || losses.length === 0) return DASH;
      const avgWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length;
      const avgLoss = Math.abs(
        losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length,
      );
      if (avgLoss === 0) return DASH;
      return { value: (avgWin / avgLoss).toFixed(1), tone: 'neutral' };
    }
    case 'profit_factor': {
      const gp = trades.reduce(
        (s, t) => s + ((t.pnl ?? 0) > 0 ? (t.pnl ?? 0) : 0),
        0,
      );
      const gl = Math.abs(
        trades.reduce((s, t) => s + ((t.pnl ?? 0) < 0 ? (t.pnl ?? 0) : 0), 0),
      );
      if (gl === 0) return DASH;
      return { value: (gp / gl).toFixed(2), tone: 'neutral' };
    }
    case 'month_pnl': {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const month = trades.filter((t) => {
        const d = new Date(t.traded_at);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      if (month.length === 0) return DASH;
      const sum = month.reduce((s, t) => s + (t.pnl ?? 0), 0);
      return { value: formatPnlCompact(sum, currency), tone: toneBySign(sum) };
    }
    case 'best_pair': {
      if (trades.length === 0) return DASH;
      const map = new Map<string, number>();
      for (const t of trades) {
        map.set(t.currency_pair, (map.get(t.currency_pair) ?? 0) + (t.pnl ?? 0));
      }
      let bestPair = '—';
      let bestVal = -Infinity;
      for (const [pair, val] of map) {
        if (val > bestVal) {
          bestVal = val;
          bestPair = pair;
        }
      }
      return { value: bestPair, tone: 'neutral' };
    }
    case 'avg_pips': {
      const withPips = trades.filter((t) => t.pnl_pips != null);
      if (withPips.length === 0) return DASH;
      const avg =
        withPips.reduce((s, t) => s + (t.pnl_pips ?? 0), 0) / withPips.length;
      return {
        value: `${avg >= 0 ? '+' : ''}${avg.toFixed(1)}`,
        tone: toneBySign(avg),
      };
    }
    default:
      return DASH;
  }
}

/** 保存値を検証し、最大3件・無効値除外・未設定はデフォルトにフォールバック。 */
export function resolveShowcaseStats(
  stats: string[] | null | undefined,
): StatKey[] {
  const valid = (stats ?? []).filter((s): s is StatKey =>
    (STAT_KEYS as string[]).includes(s),
  );
  const list = valid.length > 0 ? valid : DEFAULT_SHOWCASE_STATS;
  return list.slice(0, MAX_SHOWCASE_STATS);
}
