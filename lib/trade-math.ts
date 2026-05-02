import { isFxPair, TradeDirection, TradeResult } from './types';

/**
 * 文字列を数値にパース。空文字や不正値の場合は null。
 */
export function parseNumOrNull(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 文字列の数値に勝敗の符号を適用。
 *   win  → 絶対値（プラス）
 *   loss → マイナス
 */
export function applySignToString(
  value: string,
  result: TradeResult,
): string {
  if (value.trim() === '') return value;
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return value;
  const desired = result === 'loss' ? -Math.abs(n) : Math.abs(n);
  return String(desired);
}

/**
 * 数値に勝敗の符号を適用。result が null なら値そのまま。
 */
export function applySignToNum(
  value: number | null,
  result: TradeResult | null,
): number | null {
  if (value === null || result === null) return value;
  return result === 'loss' ? -Math.abs(value) : Math.abs(value);
}

/**
 * エントリー価格・エグジット価格・方向から pips を自動計算。
 * FX以外（仮想通貨・商品・指数）は計算ロジックが銘柄ごとに違うので null を返す。
 */
export function computePips(
  pair: string,
  direction: TradeDirection,
  entry: number,
  exit: number,
): number | null {
  if (!isFxPair(pair)) return null;
  const isJpyPair = pair.toUpperCase().endsWith('/JPY');
  const multiplier = isJpyPair ? 100 : 10000;
  const diff = direction === 'long' ? exit - entry : entry - exit;
  return diff * multiplier;
}

/**
 * フォームの state から pips を再計算した新しい state を返す。
 * entry/exit/pair/direction が揃っていない場合は元の state を返す。
 */
export function recalcPipsField<
  T extends {
    entryPrice: string;
    exitPrice: string;
    currencyPair: string;
    direction: TradeDirection;
    pnlPips: string;
  },
>(form: T): T {
  const entry = parseNumOrNull(form.entryPrice);
  const exit = parseNumOrNull(form.exitPrice);
  if (entry === null || exit === null) return form;
  const pips = computePips(form.currencyPair, form.direction, entry, exit);
  if (pips === null) return form;
  const rounded = Math.round(pips * 10) / 10;
  return { ...form, pnlPips: String(rounded) };
}
