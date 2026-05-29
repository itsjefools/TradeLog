// 詳細トレードレポートの PDF 生成 (Premium)
// expo-print で HTML → PDF。expo-sharing で共有/保存。
// 値は計算をクライアント側で行い、画像/フォントなしで描画(SVG埋め込み)できる軽量な構成。

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatPnlWithCurrency } from './format-currency';
import { Trade } from './types';

type PdfStats = {
  count: number;
  totalPnl: number;
  hasPnl: boolean;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdown: number;
  bestPair: string | null;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  byPair: { pair: string; trades: number; pnl: number; winRate: number | null }[];
  curve: { x: number; v: number }[]; // x: 0..1 normalized, v: cumulative pnl
};

function computeStats(trades: Trade[]): PdfStats {
  const withPnl = trades.filter((t) => t.pnl !== null);
  const totalPnl = withPnl.reduce((s, t) => s + (t.pnl ?? 0), 0);

  const withResult = trades.filter((t) => t.result !== null);
  const wins = withResult.filter((t) => t.result === 'win').length;
  const winRate =
    withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : null;

  const grossWin = withPnl
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    withPnl.filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0),
  );
  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;

  // ペア別
  const pairMap = new Map<
    string,
    { trades: number; pnl: number; wins: number; losses: number }
  >();
  for (const t of trades) {
    const k = t.currency_pair;
    const cur = pairMap.get(k) ?? { trades: 0, pnl: 0, wins: 0, losses: 0 };
    cur.trades += 1;
    cur.pnl += t.pnl ?? 0;
    if (t.result === 'win') cur.wins += 1;
    if (t.result === 'loss') cur.losses += 1;
    pairMap.set(k, cur);
  }
  const byPair = Array.from(pairMap.entries())
    .map(([pair, d]) => ({
      pair,
      trades: d.trades,
      pnl: d.pnl,
      winRate:
        d.wins + d.losses === 0
          ? null
          : Math.round((d.wins / (d.wins + d.losses)) * 100),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const bestPair = byPair.length > 0 ? byPair[0].pair : null;

  // 日別 best/worst
  const dayMap = new Map<string, number>();
  for (const t of withPnl) {
    const k = t.traded_at.slice(0, 10);
    dayMap.set(k, (dayMap.get(k) ?? 0) + (t.pnl ?? 0));
  }
  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  for (const [date, pnl] of dayMap.entries()) {
    if (bestDay === null || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (worstDay === null || pnl < worstDay.pnl) worstDay = { date, pnl };
  }

  // エクイティ曲線（時刻順累積）と最大DD
  const sorted = [...withPnl].sort(
    (a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
  );
  const points: { x: number; v: number }[] = [];
  let acc = 0;
  let peak = 0;
  let maxDrawdown = 0;
  if (sorted.length > 0) {
    points.push({ x: 0, v: 0 });
  }
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].pnl ?? 0;
    if (acc > peak) peak = acc;
    const dd = peak - acc;
    if (dd > maxDrawdown) maxDrawdown = dd;
    points.push({ x: (i + 1) / Math.max(1, sorted.length), v: acc });
  }

  return {
    count: trades.length,
    totalPnl,
    hasPnl: withPnl.length > 0,
    winRate,
    profitFactor,
    maxDrawdown,
    bestPair,
    bestDay,
    worstDay,
    byPair: byPair.slice(0, 8),
    curve: points,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function curveSvg(curve: { x: number; v: number }[], totalPnl: number): string {
  if (curve.length < 2) {
    return '<svg viewBox="0 0 600 180" width="100%" height="180"></svg>';
  }
  const W = 600;
  const H = 180;
  const pad = 8;
  const innerH = H - pad * 2;
  const vs = curve.map((p) => p.v);
  const min = Math.min(0, ...vs);
  const max = Math.max(0, ...vs);
  const range = max - min || 1;
  const yAt = (v: number) => pad + innerH - ((v - min) / range) * innerH;
  const xAt = (xn: number) => xn * W;
  const line = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.x).toFixed(1)},${yAt(p.v).toFixed(1)}`)
    .join(' ');
  const last = curve[curve.length - 1];
  const area = `${line} L${xAt(last.x).toFixed(1)},${H} L0,${H} Z`;
  const color = totalPnl >= 0 ? '#10B981' : '#EF4444';
  const zeroY = yAt(0);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${min < 0 && max > 0 ? `<line x1="0" y1="${zeroY.toFixed(1)}" x2="${W}" y2="${zeroY.toFixed(1)}" stroke="rgba(15,23,42,0.18)" stroke-width="1" stroke-dasharray="4,4"/>` : ''}
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

type Labels = {
  reportTitle: string;
  user: string;
  period: string;
  generated: string;
  summary: string;
  totalPnl: string;
  winRate: string;
  trades: string;
  profitFactor: string;
  maxDrawdown: string;
  bestPair: string;
  equityCurve: string;
  byPair: string;
  pair: string;
  pnl: string;
  bestDay: string;
  worstDay: string;
};

function buildHtml(opts: {
  stats: PdfStats;
  currency: string | null | undefined;
  user: string;
  periodLabel: string;
  generatedAt: Date;
  labels: Labels;
}): string {
  const { stats, currency, user, periodLabel, generatedAt, labels } = opts;
  const fmt = (n: number) => esc(formatPnlWithCurrency(n, currency));
  const pnlClass = (n: number) => (n > 0 ? 'win' : n < 0 ? 'loss' : '');
  const pf =
    stats.profitFactor === null
      ? '—'
      : stats.profitFactor === Infinity
        ? '∞'
        : stats.profitFactor.toFixed(2);

  const pairRows = stats.byPair
    .map(
      (p) => `
      <tr>
        <td><strong>${esc(p.pair)}</strong></td>
        <td>${p.trades}</td>
        <td class="${pnlClass(p.pnl)}">${fmt(p.pnl)}</td>
        <td>${p.winRate === null ? '—' : `${p.winRate}%`}</td>
      </tr>`,
    )
    .join('');

  const dayCell = (
    d: { date: string; pnl: number } | null,
    label: string,
  ) => {
    if (!d) return `<div class="day-card"><div class="day-label">${esc(label)}</div><div class="day-value">—</div></div>`;
    return `<div class="day-card">
      <div class="day-label">${esc(label)}</div>
      <div class="day-value ${pnlClass(d.pnl)}">${fmt(d.pnl)}</div>
      <div class="day-date">${esc(d.date)}</div>
    </div>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; color: #0F172A; margin: 0; }
  .hero {
    display: flex; align-items: flex-start; justify-content: space-between;
    border-bottom: 2px solid #10B981; padding-bottom: 14px;
  }
  h1 { font-size: 26px; margin: 0; letter-spacing: -0.5px; font-weight: 800; }
  .accent { color: #10B981; }
  .user { font-size: 13px; color: #475569; margin-top: 4px; }
  .meta { text-align: right; font-size: 10px; color: #64748B; }
  .meta div + div { margin-top: 3px; }
  section { margin-top: 26px; }
  h2 {
    font-size: 11px; color: #64748B; text-transform: uppercase;
    letter-spacing: 1.5px; margin: 0 0 12px; font-weight: 800;
  }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .kpi {
    background: #F8FAFC; border-radius: 12px; padding: 14px 14px 12px;
    border: 1px solid #E5E7EB;
  }
  .kpi-label {
    font-size: 10px; color: #64748B; text-transform: uppercase;
    letter-spacing: 0.8px; font-weight: 700;
  }
  .kpi-value {
    font-size: 22px; font-weight: 800; margin-top: 6px; letter-spacing: -0.3px;
  }
  .win { color: #10B981; }
  .loss { color: #EF4444; }
  .chart-wrap {
    background: #F8FAFC; border-radius: 12px; padding: 14px;
    border: 1px solid #E5E7EB;
  }
  .days { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .day-card {
    background: #F8FAFC; border-radius: 12px; padding: 14px;
    border: 1px solid #E5E7EB;
  }
  .day-label {
    font-size: 10px; color: #64748B; text-transform: uppercase;
    letter-spacing: 0.8px; font-weight: 700;
  }
  .day-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
  .day-date { font-size: 11px; color: #94A3B8; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td {
    padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: left;
  }
  th { font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer {
    margin-top: 30px; padding-top: 12px; border-top: 1px solid #E5E7EB;
    font-size: 9px; color: #94A3B8; text-align: center;
  }
</style>
</head>
<body>
  <div class="hero">
    <div>
      <h1>Trade<span class="accent">Log</span></h1>
      <div class="user">${esc(user)} · ${esc(labels.reportTitle)}</div>
    </div>
    <div class="meta">
      <div>${esc(labels.period)}: ${esc(periodLabel)}</div>
      <div>${esc(labels.generated)}: ${esc(generatedAt.toISOString().slice(0, 10))}</div>
    </div>
  </div>

  <section>
    <h2>${esc(labels.summary)}</h2>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">${esc(labels.totalPnl)}</div><div class="kpi-value ${pnlClass(stats.totalPnl)}">${stats.hasPnl ? fmt(stats.totalPnl) : '—'}</div></div>
      <div class="kpi"><div class="kpi-label">${esc(labels.winRate)}</div><div class="kpi-value">${stats.winRate === null ? '—' : `${stats.winRate}%`}</div></div>
      <div class="kpi"><div class="kpi-label">${esc(labels.trades)}</div><div class="kpi-value">${stats.count}</div></div>
      <div class="kpi"><div class="kpi-label">${esc(labels.profitFactor)}</div><div class="kpi-value">${pf}</div></div>
      <div class="kpi"><div class="kpi-label">${esc(labels.maxDrawdown)}</div><div class="kpi-value loss">${fmt(-stats.maxDrawdown)}</div></div>
      <div class="kpi"><div class="kpi-label">${esc(labels.bestPair)}</div><div class="kpi-value">${stats.bestPair ? esc(stats.bestPair) : '—'}</div></div>
    </div>
  </section>

  <section>
    <h2>${esc(labels.equityCurve)}</h2>
    <div class="chart-wrap">${curveSvg(stats.curve, stats.totalPnl)}</div>
  </section>

  <section>
    <div class="days">
      ${dayCell(stats.bestDay, labels.bestDay)}
      ${dayCell(stats.worstDay, labels.worstDay)}
    </div>
  </section>

  ${
    stats.byPair.length > 0
      ? `<section>
    <h2>${esc(labels.byPair)}</h2>
    <table>
      <thead><tr>
        <th>${esc(labels.pair)}</th>
        <th>${esc(labels.trades)}</th>
        <th>${esc(labels.pnl)}</th>
        <th>${esc(labels.winRate)}</th>
      </tr></thead>
      <tbody>${pairRows}</tbody>
    </table>
  </section>`
      : ''
  }

  <div class="footer">${esc(labels.generated)} ${esc(generatedAt.toISOString().slice(0, 10))} · TradeLog</div>
</body>
</html>`;
}

export async function exportTradesPdf(opts: {
  trades: Trade[];
  currency: string | null | undefined;
  user: string;
  periodLabel: string;
  labels: Labels;
}): Promise<string> {
  const stats = computeStats(opts.trades);
  const html = buildHtml({
    stats,
    currency: opts.currency,
    user: opts.user,
    periodLabel: opts.periodLabel,
    generatedAt: new Date(),
    labels: opts.labels,
  });
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
    });
  }
  return uri;
}
