import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={icon}
          size={32}
          color={c.textSecondary}
          style={{ opacity: 0.5 }}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Pressable
          onPress={onSecondary}
          hitSlop={8}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      minHeight: 300,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
    action: {
      marginTop: 24,
      paddingVertical: 12,
      paddingHorizontal: 28,
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
    secondary: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
    secondaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.accent,
    },
  });
}
