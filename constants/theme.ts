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
// FX セマンティクスの緑(利確) + 赤(損切)。アクセントもブランド緑で統一。
const ACCENT = '#10B981';
const WIN = '#10B981';
const LOSS = '#EF4444';
const STAR = '#F59E0B';
const VERIFIED = '#10B981';
const DANGER = '#EF4444';
const ON_ACCENT = '#000000';

export const darkColors: ThemeColors = {
  background: '#000000',
  // 真っ黒の上に乗せるカード/入力欄。背景との差はごく僅か。
  surface: '#0E0E10',
  surfaceAlt: '#16161A',
  // ヘアラインだが薄すぎず、構造が見えるレベル
  border: 'rgba(255,255,255,0.09)',
  textPrimary: '#FFFFFF',
  // 二次テキストは少し柔らかく(視認性向上)
  textSecondary: '#9CA0A6',
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
  border: 'rgba(0,0,0,0.10)',
  textPrimary: '#0A0A0A',
  textSecondary: '#6B7178',
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
