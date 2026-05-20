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

/** 通貨の小数桁数を返す(入力フォームのバリデーション等で使う) */
export function getCurrencyDecimals(currencyCode: string | null | undefined): number {
  return getCurrencyInfo(currencyCode).decimals;
}

/** 通貨記号だけ取得 */
export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  return getCurrencyInfo(currencyCode).symbol;
}
