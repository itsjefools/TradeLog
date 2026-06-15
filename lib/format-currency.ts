import { getCurrencyInfo } from './types';

/**
 * 通貨込みで P&L を整形する。
 * 通貨ごとの慣習に従う:
 *   JPY: 整数 + 千区切り + ¥ プレフィックス (例: "+12,500 ¥")
 *   USD等: 小数2桁 + 千区切り + $ プレフィックス (例: "+125.30 $")
 *
 * 損益の符号も付ける (+/-)。
 */
export function formatPnlWithCurrency(
  amount: number,
  currencyCode: string | null | undefined,
): string {
  const info = getCurrencyInfo(currencyCode);
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted =
    info.decimals === 0
      ? Math.round(abs).toLocaleString('en-US')
      : abs.toLocaleString('en-US', {
          minimumFractionDigits: info.decimals,
          maximumFractionDigits: info.decimals,
        });
  return `${sign}${info.symbol}${formatted}`;
}

/**
 * 大きな金額を短縮表記で整形する（K/M/B/T）。狭い場所（プロフィールの成績枠等）用。
 * 1000未満は通常表記にフォールバック。例: "+R$674M" / "-¥1.2K"
 */
export function formatPnlCompact(
  amount: number,
  currencyCode: string | null | undefined,
): string {
  const abs = Math.abs(amount);
  if (abs < 1000) return formatPnlWithCurrency(amount, currencyCode);
  const info = getCurrencyInfo(currencyCode);
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  const units = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      const n = abs / u.v;
      const str = n >= 100 ? n.toFixed(0) : n.toFixed(1);
      const trimmed = str.endsWith('.0') ? str.slice(0, -2) : str;
      return `${sign}${info.symbol}${trimmed}${u.s}`;
    }
  }
  return formatPnlWithCurrency(amount, currencyCode);
}

/** 通貨の小数桁数を返す(入力フォームのバリデーション等で使う) */
export function getCurrencyDecimals(currencyCode: string | null | undefined): number {
  return getCurrencyInfo(currencyCode).decimals;
}

/** 通貨記号だけ取得 */
export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  return getCurrencyInfo(currencyCode).symbol;
}
