import { formatPnlWithCurrency } from './format-currency';
import { Trade } from './types';

/**
 * 端末内だけで動くルールベースの「トレード診断」エンジン。
 *
 * バックエンド・APIキー・課金は一切不要で、useTrades() の Trade[] を
 * その場で集計して気づきを返す。pnl が記録された取引のみを対象にする。
 */

export type InsightSeverity = 'good' | 'warning' | 'tip';

export type Insight = {
  id: string;
  severity: InsightSeverity;
  /** 翻訳キー (aiReview.<textKey>) */
  textKey: string;
  /** 翻訳補間用パラメータ ({{pair}} 等) */
  textParams?: Record<string, string | number>;
};

// 曜日 index(getDay) → 翻訳キーの suffix
const WEEKDAY_KEYS = [
  'daySun',
  'dayMon',
  'dayTue',
  'dayWed',
  'dayThu',
  'dayFri',
  'daySat',
] as const;

// 診断として意味を持つ最低取引数
const MIN_TRADES = 5;

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/**
 * Trade[] を集計して診断 (Insight[]) を返す。
 * - pnl !== null の取引のみ対象。
 * - 取引が少なすぎる場合は「データ不足」を1件返す。
 * - 該当が0件なら「この調子」を1件返す。
 * - 最終的に warning → tip → good の重要度順に並べ、最大7件に絞る。
 */
export function computeInsights(
  trades: Trade[],
  currency?: string | null,
): Insight[] {
  // pnl が入っている取引のみを集計対象にする
  const rows = (trades ?? []).filter(
    (t) => t != null && typeof t.pnl === 'number' && Number.isFinite(t.pnl),
  );

  if (rows.length < MIN_TRADES) {
    return [{ id: 'not_enough', severity: 'tip', textKey: 'ins_not_enough' }];
  }

  const fmt = (n: number) => formatPnlWithCurrency(n, currency);
  const insights: Insight[] = [];

  const wins = rows.filter((t) => (t.pnl as number) > 0);
  const losses = rows.filter((t) => (t.pnl as number) < 0);

  // ---- RR (平均利益 vs 平均損失の絶対値) ----
  if (wins.length >= 1 && losses.length >= 1) {
    const avgWin =
      wins.reduce((s, t) => s + (t.pnl as number), 0) / wins.length;
    const avgLossAbs = Math.abs(
      losses.reduce((s, t) => s + (t.pnl as number), 0) / losses.length,
    );
    if (avgLossAbs > 0) {
      const ratio = avgWin / avgLossAbs;
      if (avgLossAbs > avgWin) {
        // 1回の負けが1回の勝ちより大きい → 損切りが利確より大きい
        insights.push({
          id: 'rr',
          severity: 'warning',
          textKey: 'ins_rr_bad',
          textParams: { ratio: round1(ratio) },
        });
      } else if (ratio >= 1.5) {
        insights.push({
          id: 'rr',
          severity: 'good',
          textKey: 'ins_rr_good',
          textParams: { ratio: round1(ratio) },
        });
      }
    }
  }

  // ---- ペア別合計 pnl ----
  const byPair = new Map<string, { sum: number; count: number }>();
  for (const t of rows) {
    const pair = t.currency_pair || '—';
    const cur = byPair.get(pair) ?? { sum: 0, count: 0 };
    cur.sum += t.pnl as number;
    cur.count += 1;
    byPair.set(pair, cur);
  }

  // 得意ペア: 合計 pnl 最大 (pnl > 0)
  let bestPair: { pair: string; sum: number } | null = null;
  let worstPair: { pair: string; sum: number; count: number } | null = null;
  for (const [pair, { sum, count }] of byPair) {
    if (sum > 0 && (!bestPair || sum > bestPair.sum)) {
      bestPair = { pair, sum };
    }
    if (sum < 0 && count >= 3 && (!worstPair || sum < worstPair.sum)) {
      worstPair = { pair, sum, count };
    }
  }
  if (bestPair) {
    insights.push({
      id: 'best_pair',
      severity: 'good',
      textKey: 'ins_best_pair',
      textParams: { pair: bestPair.pair, pnl: fmt(bestPair.sum) },
    });
  }
  if (worstPair) {
    insights.push({
      id: 'worst_pair',
      severity: 'tip',
      textKey: 'ins_worst_pair',
      textParams: { pair: worstPair.pair, pnl: fmt(worstPair.sum) },
    });
  }

  // ---- 曜日別勝率 (各3件以上) ----
  const byWeekday: { wins: number; total: number }[] = WEEKDAY_KEYS.map(() => ({
    wins: 0,
    total: 0,
  }));
  for (const t of rows) {
    const d = new Date(t.traded_at);
    const day = d.getDay();
    if (day < 0 || day > 6 || Number.isNaN(day)) continue;
    byWeekday[day].total += 1;
    if ((t.pnl as number) > 0) byWeekday[day].wins += 1;
  }
  let strongDay: { idx: number; rate: number } | null = null;
  let weakDay: { idx: number; rate: number } | null = null;
  byWeekday.forEach((w, idx) => {
    if (w.total < 3) return;
    const rate = w.wins / w.total;
    if (!strongDay || rate > strongDay.rate) strongDay = { idx, rate };
    if (!weakDay || rate < weakDay.rate) weakDay = { idx, rate };
  });
  // 強い曜日と弱い曜日が同じ/差が無い場合は出さない
  if (
    strongDay &&
    weakDay &&
    (strongDay as { idx: number }).idx !== (weakDay as { idx: number }).idx &&
    (strongDay as { rate: number }).rate > (weakDay as { rate: number }).rate
  ) {
    const weak = weakDay as { idx: number; rate: number };
    const strong = strongDay as { idx: number; rate: number };
    insights.push({
      id: 'weekday_weak',
      severity: 'tip',
      textKey: 'ins_weekday_weak',
      textParams: { weekday: `record.${WEEKDAY_KEYS[weak.idx]}` },
    });
    insights.push({
      id: 'weekday_strong',
      severity: 'good',
      textKey: 'ins_weekday_strong',
      textParams: { weekday: `record.${WEEKDAY_KEYS[strong.idx]}` },
    });
  }

  // ---- プロフィットファクター ----
  const grossProfit = wins.reduce((s, t) => s + (t.pnl as number), 0);
  const grossLossAbs = Math.abs(
    losses.reduce((s, t) => s + (t.pnl as number), 0),
  );
  if (grossLossAbs > 0) {
    const pf = grossProfit / grossLossAbs;
    if (pf >= 1.5) {
      insights.push({
        id: 'pf',
        severity: 'good',
        textKey: 'ins_pf_good',
        textParams: { pf: round1(pf) },
      });
    } else if (pf < 1) {
      insights.push({
        id: 'pf',
        severity: 'warning',
        textKey: 'ins_pf_bad',
        textParams: { pf: round1(pf) },
      });
    }
  }

  // ---- 連勝 / 連敗 (traded_at 昇順) ----
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
  );
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let curWin = 0;
  let curLose = 0;
  for (const t of sorted) {
    const pnl = t.pnl as number;
    if (pnl > 0) {
      curWin += 1;
      curLose = 0;
      if (curWin > maxWinStreak) maxWinStreak = curWin;
    } else if (pnl < 0) {
      curLose += 1;
      curWin = 0;
      if (curLose > maxLoseStreak) maxLoseStreak = curLose;
    } else {
      // 損益0 (引き分け) は連続を途切れさせる
      curWin = 0;
      curLose = 0;
    }
  }
  if (maxLoseStreak >= 4) {
    insights.push({
      id: 'lose_streak',
      severity: 'warning',
      textKey: 'ins_lose_streak',
      textParams: { count: maxLoseStreak },
    });
  }
  if (maxWinStreak >= 5) {
    insights.push({
      id: 'win_streak',
      severity: 'good',
      textKey: 'ins_win_streak',
      textParams: { count: maxWinStreak },
    });
  }

  // ---- 連敗後のロット増 ----
  // 「損失の次の取引」のロット平均 > 全体ロット平均 × 1.2 なら警告
  const allLots = sorted
    .map((t) => t.lot_size)
    .filter((l) => typeof l === 'number' && Number.isFinite(l) && l > 0);
  if (allLots.length >= MIN_TRADES) {
    const avgLot = allLots.reduce((s, l) => s + l, 0) / allLots.length;
    const afterLossLots: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].pnl as number;
      const lot = sorted[i].lot_size;
      if (prev < 0 && typeof lot === 'number' && Number.isFinite(lot) && lot > 0) {
        afterLossLots.push(lot);
      }
    }
    if (afterLossLots.length >= 2 && avgLot > 0) {
      const avgAfterLoss =
        afterLossLots.reduce((s, l) => s + l, 0) / afterLossLots.length;
      if (avgAfterLoss > avgLot * 1.2) {
        insights.push({
          id: 'lot_after_loss',
          severity: 'warning',
          textKey: 'ins_lot_after_loss',
        });
      }
    }
  }

  // ---- 集中度 (1ペアが全体の70%以上) ----
  let topConc: { pair: string; pct: number } | null = null;
  for (const [pair, { count }] of byPair) {
    const pct = count / rows.length;
    if (pct >= 0.7 && (!topConc || pct > topConc.pct)) {
      topConc = { pair, pct };
    }
  }
  if (topConc) {
    insights.push({
      id: 'concentration',
      severity: 'tip',
      textKey: 'ins_concentration',
      textParams: { pair: topConc.pair, pct: Math.round(topConc.pct * 100) },
    });
  }

  // ---- タグ別合計 pnl (任意・データが十分あれば) ----
  const byTag = new Map<string, { sum: number; count: number }>();
  for (const t of rows) {
    const tags = Array.isArray(t.tags) ? t.tags : [];
    for (const tag of tags) {
      if (!tag) continue;
      const cur = byTag.get(tag) ?? { sum: 0, count: 0 };
      cur.sum += t.pnl as number;
      cur.count += 1;
      byTag.set(tag, cur);
    }
  }
  if (byTag.size >= 2) {
    let bestTag: { tag: string; sum: number } | null = null;
    let worstTag: { tag: string; sum: number } | null = null;
    for (const [tag, { sum, count }] of byTag) {
      if (count < 3) continue;
      if (sum > 0 && (!bestTag || sum > bestTag.sum)) bestTag = { tag, sum };
      if (sum < 0 && (!worstTag || sum < worstTag.sum)) worstTag = { tag, sum };
    }
    if (bestTag) {
      insights.push({
        id: 'best_tag',
        severity: 'good',
        textKey: 'ins_best_tag',
        textParams: { tag: `tags.${bestTag.tag}`, pnl: fmt(bestTag.sum) },
      });
    }
    if (worstTag) {
      insights.push({
        id: 'worst_tag',
        severity: 'tip',
        textKey: 'ins_worst_tag',
        textParams: { tag: `tags.${worstTag.tag}`, pnl: fmt(worstTag.sum) },
      });
    }
  }

  if (insights.length === 0) {
    return [{ id: 'keep_going', severity: 'good', textKey: 'ins_keep_going' }];
  }

  // 重要度順 (warning → tip → good) に並べ替えて最大7件
  const order: Record<InsightSeverity, number> = {
    warning: 0,
    tip: 1,
    good: 2,
  };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);
  return insights.slice(0, 7);
}
