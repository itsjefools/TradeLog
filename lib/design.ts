import { Platform } from 'react-native';

// 間隔ルール (4の倍数)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// 角丸ルール
export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  pill: 999,
} as const;

// フォントサイズ
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  title: 32,
} as const;

// シャドウ (iOS + Android)
export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

// タッチ透過度
export const ACTIVE_OPACITY = 0.7;

// セパレーター色 (テーマに依存しない共通アルファ)
export const separatorColor = (isDark: boolean) =>
  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

// === プラン・招待画面専用カラー ===
export const PLAN_COLORS = {
  // ゴールド系
  gold: '#D4A855',
  goldLight: '#E8C97A',
  goldDark: '#B8912E',
  goldBorder: 'rgba(212, 168, 85, 0.6)',
  goldBorderStrong: 'rgba(212, 168, 85, 0.8)',
  goldGlow: 'rgba(212, 168, 85, 0.15)',

  // プランカード
  plusBorder: '#10B981',
  plusBorderLight: 'rgba(16, 185, 129, 0.3)',
  plusBg: {
    light: 'rgba(16, 185, 129, 0.04)',
    dark: 'rgba(16, 185, 129, 0.08)',
  },
  proBorder: {
    light: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(255, 255, 255, 0.1)',
  },
  proBg: {
    light: 'rgba(0, 0, 0, 0.02)',
    dark: 'rgba(255, 255, 255, 0.04)',
  },

  // 招待画面ヒーロー背景
  inviteHeroBg: {
    light: '#FDF6E3',
    dark: '#1A1508',
  },
  inviteHeroBorder: {
    light: 'rgba(212, 168, 85, 0.2)',
    dark: 'rgba(212, 168, 85, 0.3)',
  },

  // ボタン
  shareButton: {
    light: '#F5E6B8',
    dark: 'rgba(212, 168, 85, 0.2)',
  },
  shareButtonText: {
    light: '#8B6914',
    dark: '#D4A855',
  },

  // テーブル
  tableBorder: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.06)',
  },
  tableHeaderBg: {
    light: 'rgba(0, 0, 0, 0.02)',
    dark: 'rgba(255, 255, 255, 0.03)',
  },

  // 統計カード
  statCardBg: {
    light: '#FFFFFF',
    dark: 'rgba(255, 255, 255, 0.05)',
  },
  statCardBorder: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },

  // テキスト
  textPrimary: {
    light: '#000000',
    dark: '#FFFFFF',
  },
  textSecondary: {
    light: '#666666',
    dark: '#999999',
  },
  textMuted: {
    light: '#999999',
    dark: '#666666',
  },

  // 背景
  screenBg: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  cardBg: {
    light: '#FFFFFF',
    dark: 'rgba(255, 255, 255, 0.05)',
  },
} as const;
