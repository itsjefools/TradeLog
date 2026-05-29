// pips / points 表示の共通フォーマッタ。
// 値は pips のまま保存・計算し、表示単位だけプロフィール設定 (profile.pip_unit) で切替。
// 呼び出し側で毎回 unit を引き回さなくて済むよう、現在のユーザー設定はモジュール変数に保持する。
// プロフィール読み込み時に setPipUnit() を呼ぶことで反映する(hooks/use-profile.tsx)。

export type PipUnit = 'pips' | 'points';

let CURRENT_UNIT: PipUnit = 'pips';

export function setPipUnit(u: PipUnit | null | undefined): void {
  CURRENT_UNIT = u === 'points' ? 'points' : 'pips';
}

export function getPipUnit(): PipUnit {
  return CURRENT_UNIT;
}

export function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} ${CURRENT_UNIT}`;
}
