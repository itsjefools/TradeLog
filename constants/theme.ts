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
const ACCENT = '#6366F1';
const WIN = '#10B981';
const LOSS = '#EF4444';
const STAR = '#F59E0B';
const VERIFIED = '#3B82F6';
const DANGER = '#EF4444';
const ON_ACCENT = '#FFFFFF';

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273449',
  border: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
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
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
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
