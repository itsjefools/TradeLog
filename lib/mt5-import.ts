// MT5 の「取引履歴レポート」(XLSX/CSV) からポジション一覧を解析し、
// TradeLog の trades 形式に変換する。
//
// 対応: MT5 PCアプリ「履歴」→ レポート(XLSX) / CSV。
// ポジション表の列: 時間 | ポジション | 銘柄 | タイプ | 数量 | 価格 | S/L | T/P |
//                   時間(決済) | 価格(決済) | 手数料 | スワップ | 損益
// 日本語/英語どちらのヘッダーでも動くようにキーワードで判定する。

export type ParsedTrade = {
  externalId: string; // MT5 ポジション番号（重複防止キー）
  currencyPair: string; // 正規化後 (XAU/USD など)
  rawSymbol: string;
  direction: 'long' | 'short';
  lotSize: number;
  entryPrice: number | null;
  exitPrice: number | null;
  pnl: number; // net = profit + commission + swap
  tradedAt: string; // ISO
  result: 'win' | 'loss' | null;
};

export type ParseResult = {
  trades: ParsedTrade[];
  totalPnl: number;
  wins: number;
  errorKey?: string; // 失敗時の翻訳キー（mt5Import.*）
};

const SUFFIX_RE = /\.(p|m|raw|pro|ecn|c|i|sml|mini)$/i;
const ALIAS: Record<string, string> = {
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  XPTUSD: 'XPT/USD',
  BTCUSD: 'BTC/USD',
  ETHUSD: 'ETH/USD',
  US30: 'US30',
  US500: 'SPX500',
  USTEC: 'NAS100',
  NAS100: 'NAS100',
  JP225: 'JP225',
  GER40: 'GER40',
  UK100: 'UK100',
};

export function normalizeSymbol(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  const base = s.replace(SUFFIX_RE, '');
  if (ALIAS[base]) return ALIAS[base];
  const m = base.match(/^([A-Z]{3})([A-Z]{3})$/);
  if (m) return `${m[1]}/${m[2]}`;
  return base;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[, ]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

const DT_RE = /^\d{4}[.\-/]\d{2}[.\-/]\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

function toIso(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!DT_RE.test(s)) return null;
  // 2026.02.23 05:35:58 → 2026-02-23T05:35:58
  const [datePart, timePart] = s.split(/[ T]/);
  const date = datePart.replace(/[./]/g, '-');
  const time = timePart.length === 5 ? `${timePart}:00` : timePart;
  return `${date}T${time}`;
}

/**
 * sheet_to_json(header:1) で得た2次元配列(rows)を解析する。
 */
export function parseMt5Rows(rows: unknown[][]): ParseResult {
  // ヘッダー行を探す（「ポジション情報/ポジション」「損益」を含む or "Position"/"Profit"）
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map((c) => String(c ?? '').toLowerCase());
    const joined = cells.join('|');
    const hasPos =
      joined.includes('ポジション') || joined.includes('position');
    const hasProfit = joined.includes('損益') || joined.includes('profit');
    const hasType = joined.includes('タイプ') || joined.includes('type');
    if (hasPos && hasProfit && hasType) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { trades: [], totalPnl: 0, wins: 0, errorKey: 'noTable' };
  }

  const trades: ParsedTrade[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const c = rows[i] || [];
    const openIso = toIso(c[0]);
    const ticket = String(c[1] ?? '').trim();
    const typ = String(c[3] ?? '').trim().toLowerCase();
    // 明細行でなくなったら終了（次セクションの見出し等）
    if (!openIso || !/^\d+$/.test(ticket)) break;
    if (typ !== 'buy' && typ !== 'sell') continue;

    const profit = toNum(c[12]);
    const commission = toNum(c[10]);
    const swap = toNum(c[11]);
    const net = Math.round(profit + commission + swap);
    const rawSymbol = String(c[2] ?? '').trim();

    trades.push({
      externalId: ticket,
      currencyPair: normalizeSymbol(rawSymbol),
      rawSymbol,
      direction: typ === 'buy' ? 'long' : 'short',
      lotSize: toNum(c[4]),
      entryPrice: toNum(c[5]) || null,
      exitPrice: toNum(c[9]) || null,
      pnl: net,
      tradedAt: openIso,
      result: net > 0 ? 'win' : net < 0 ? 'loss' : null,
    });
  }

  if (trades.length === 0) {
    return { trades: [], totalPnl: 0, wins: 0, errorKey: 'noTrades' };
  }

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  return { trades, totalPnl, wins };
}
