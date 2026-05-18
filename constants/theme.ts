/**
 * TradeLog テーマカラー定義。
 *
 * 共通アクセント色（インディゴ・緑・赤・星黄色など）はモードに関係なく
 * 同じ値を使う設計。背景・サーフェス・テキスト・ボーダーだけが切り替わる。
 *
 * 各画面では `useThemeColors()` を呼んで色を取得し、
 * `useMemo(() => makeStyles(c), [c])` で StyleSheet を作る。
 */

import { Platform } from 'react-native';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  // モード共通色（参考用に theme オブジェクトにも入れる）
  accent: string;
  win: string;
  loss: string;
  star: string;
  verified: string;
  danger: string;
  // ボタン文字色など、白背景でも常に白のままにする色
  onAccent: string;
};

// アクセント・ステータス色（モード非依存）
// 近未来的ミニマリスト = シアンアクセント。
// FX セマンティクスの緑/赤は維持。
const ACCENT = '#00D9FF';
const WIN = '#10B981';
const LOSS = '#EF4444';
const STAR = '#F59E0B';
const VERIFIED = '#00D9FF';
const DANGER = '#EF4444';
const ON_ACCENT = '#000000';

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#0A0A0A',
  surfaceAlt: '#141414',
  border: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8D91',
  accent: ACCENT,
  win: WIN,
  loss: LOSS,
  star: STAR,
  verified: VERIFIED,
  danger: DANGER,
  onAccent: ON_ACCENT,
};

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceAlt: '#F2F2F4',
  border: 'rgba(0,0,0,0.08)',
  textPrimary: '#0A0A0A',
  textSecondary: '#71767B',
  accent: ACCENT,
  win: WIN,
  loss: LOSS,
  star: STAR,
  verified: VERIFIED,
  danger: DANGER,
  onAccent: ON_ACCENT,
};

export type ThemeMode = 'system' | 'light' | 'dark';

// 後方互換用（既存のコードが使ってる場合に備えて残す。新規コードではuseThemeColorsを使う）
export const Colors = {
  light: {
    text: lightColors.textPrimary,
    background: lightColors.background,
    tint: ACCENT,
    icon: lightColors.textSecondary,
    tabIconDefault: lightColors.textSecondary,
    tabIconSelected: ACCENT,
  },
  dark: {
    text: darkColors.textPrimary,
    background: darkColors.background,
    tint: ACCENT,
    icon: darkColors.textSecondary,
    tabIconDefault: darkColors.textSecondary,
    tabIconSelected: ACCENT,
  },
};

// デザイントークン: 角丸・間隔・フォントウェイト
// ミニマリストデザインなので半径は控えめ。
export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// 数字をモノスペース + 等幅(tabular figures)で表示するためのスタイル。
// FXの価格・損益・pipsなどの並びを揃えるのに使用する。
export const MonoNumber = Platform.select({
  ios: {
    fontFamily: 'ui-monospace',
    fontVariant: ['tabular-nums' as const],
  },
  android: {
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums' as const],
  },
  default: {
    fontVariant: ['tabular-nums' as const],
  },
});

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
