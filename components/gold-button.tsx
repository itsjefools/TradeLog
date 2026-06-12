import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';

import { GoldGradient } from './gold-gradient';

/**
 * 明るいシャンパン→ゴールドのメタリックグラデーションを背景に持つボタン。
 * フラットな金の“濁り”を避け、上質な金属光沢を出す。文字色は濃色推奨。
 */
export function GoldButton({
  onPress,
  disabled,
  height = 54,
  radius = 14,
  style,
  gradientId = 'gold',
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  gradientId?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        pressed && { opacity: 0.9 },
        disabled && { opacity: 0.6 },
        style,
      ]}
    >
      <GoldGradient id={gradientId} />
      {children}
    </Pressable>
  );
}
