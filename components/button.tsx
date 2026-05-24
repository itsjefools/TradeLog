import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { ACTIVE_OPACITY, borderRadius } from '@/lib/design';
import { lightImpact } from '@/lib/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { py: number; px: number; fontSize: number }> = {
  sm: { py: 10, px: 16, fontSize: 13 },
  md: { py: 14, px: 20, fontSize: 15 },
  lg: { py: 16, px: 24, fontSize: 17 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';

  const palette: Record<Variant, { bg: string; text: string }> = {
    primary: { bg: c.accent, text: c.onAccent },
    secondary: {
      bg: isDark ? 'rgba(255,255,255,0.06)' : c.surfaceAlt,
      text: c.textPrimary,
    },
    ghost: { bg: 'transparent', text: c.textPrimary },
    danger: { bg: c.loss, text: '#fff' },
  };

  const s = palette[variant];
  const sz = SIZES[size];

  const handlePress = () => {
    lightImpact();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={ACTIVE_OPACITY}
      style={{
        backgroundColor: s.bg,
        borderRadius: borderRadius.lg,
        paddingVertical: sz.py,
        paddingHorizontal: sz.px,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      }}
    >
      {loading ? (
        <ActivityIndicator color={s.text} size="small" />
      ) : (
        <Text style={{ fontSize: sz.fontSize, fontWeight: '700', color: s.text }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
