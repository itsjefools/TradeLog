import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';

export type DifficultyValue = 'all' | 'beginner' | 'intermediate' | 'advanced';

// スクールの難易度フィルタ（レッスン/動画で共用）。
// 色: 初級=緑 / 中級=琥珀 / 上級=赤。選択中はその色でハイライト。
export function DifficultyFilter({
  value,
  onChange,
}: {
  value: DifficultyValue;
  onChange: (v: DifficultyValue) => void;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);

  const colorFor = (d: DifficultyValue): string =>
    d === 'beginner'
      ? c.win
      : d === 'intermediate'
        ? c.star
        : d === 'advanced'
          ? c.loss
          : c.accent;

  const items: { key: DifficultyValue; label: string }[] = [
    { key: 'all', label: t('school.video_all') },
    { key: 'beginner', label: t('school.beginner') },
    { key: 'intermediate', label: t('school.intermediate') },
    { key: 'advanced', label: t('school.advanced') },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((it) => {
        const active = value === it.key;
        const tint = colorFor(it.key);
        return (
          <TouchableOpacity
            key={it.key}
            onPress={() => onChange(it.key)}
            activeOpacity={0.8}
            style={[
              styles.pill,
              active
                ? { borderColor: tint, backgroundColor: `${tint}1A` }
                : styles.pillInactive,
            ]}
          >
            {it.key !== 'all' && (
              <View style={[styles.dot, { backgroundColor: tint }]} />
            )}
            <Text
              style={[
                styles.label,
                active ? { color: tint, fontWeight: '800' } : styles.labelInactive,
              ]}
            >
              {it.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    pillInactive: { borderColor: c.border, backgroundColor: 'transparent' },
    dot: { width: 7, height: 7, borderRadius: 3.5 },
    label: { fontSize: 13 },
    labelInactive: { color: c.textSecondary, fontWeight: '600' },
  });
}
