import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import {
  Badge,
  computeAllBadges,
  MAX_SHOWCASE_BADGES,
  tierColor,
} from '@/lib/badges';
import { selectionFeedback } from '@/lib/haptics';

export default function BadgesScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { profile, updateProfile } = useProfile();
  const { trades } = useTrades();

  const allBadges = useMemo(
    () => computeAllBadges(trades, profile?.currency),
    [trades, profile?.currency],
  );
  const earnedCount = allBadges.filter((b) => b.earned).length;

  const [selected, setSelected] = useState<string[]>(
    profile?.showcase_badges ?? [],
  );
  const [showBadges, setShowBadges] = useState<boolean>(
    profile?.show_badges ?? true,
  );

  const persistShowcase = async (next: string[]) => {
    const prev = selected;
    setSelected(next);
    try {
      await updateProfile({ showcase_badges: next });
    } catch {
      setSelected(prev);
      toast.error(t('common.error'));
    }
  };

  const toggleShow = async (v: boolean) => {
    setShowBadges(v);
    try {
      await updateProfile({ show_badges: v });
    } catch {
      setShowBadges(!v);
      toast.error(t('common.error'));
    }
  };

  const onTapBadge = (b: Badge) => {
    if (!b.earned) return;
    selectionFeedback();
    if (selected.includes(b.id)) {
      persistShowcase(selected.filter((x) => x !== b.id));
      return;
    }
    if (selected.length >= MAX_SHOWCASE_BADGES) {
      toast.info(t('badges.maxReached', { count: MAX_SHOWCASE_BADGES }));
      return;
    }
    persistShowcase([...selected, b.id]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('badges.manageTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* 表示ON/OFF */}
        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('badges.showToggle')}</Text>
            <Text style={styles.toggleHint}>{t('badges.showHint')}</Text>
          </View>
          <Switch
            value={showBadges}
            onValueChange={toggleShow}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* 装着中 */}
        <Text style={styles.sectionLabel}>
          {t('badges.showcaseTitle', {
            count: selected.length,
            max: MAX_SHOWCASE_BADGES,
          })}
        </Text>
        <Text style={styles.sectionHint}>{t('badges.showcaseHint')}</Text>

        <View style={styles.slotsRow}>
          {Array.from({ length: MAX_SHOWCASE_BADGES }).map((_, i) => {
            const id = selected[i];
            const b = id ? allBadges.find((x) => x.id === id) : undefined;
            if (!b) {
              return (
                <View key={i} style={styles.slotEmpty}>
                  <Ionicons name="add" size={22} color={c.textSecondary} />
                </View>
              );
            }
            const col = tierColor(b.tier);
            return (
              <Pressable
                key={i}
                onPress={() => persistShowcase(selected.filter((x) => x !== id))}
                style={[styles.slotFilled, { borderColor: col }]}
              >
                <Text style={styles.slotEmoji}>{b.emoji}</Text>
                <Text style={[styles.slotLabel, { color: col }]} numberOfLines={1}>
                  {t(b.labelKey, b.labelParams)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* すべてのバッジ */}
        <View style={styles.sectionHeadRow}>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            {t('badges.allTitle')}
          </Text>
          <Text style={styles.earnedCount}>
            {t('badges.earnedCount', { earned: earnedCount, total: allBadges.length })}
          </Text>
        </View>

        <View style={styles.grid}>
          {allBadges.map((b) => {
            const isSel = selected.includes(b.id);
            const col = tierColor(b.tier);
            return (
              <Pressable
                key={b.id}
                onPress={() => onTapBadge(b)}
                style={[
                  styles.badgeCard,
                  {
                    borderColor: isSel ? col : c.border,
                    borderWidth: isSel ? 2 : 1,
                    opacity: b.earned ? 1 : 0.5,
                  },
                ]}
              >
                {isSel && (
                  <View style={[styles.selDot, { backgroundColor: col }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
                {!b.earned && (
                  <View style={styles.lockDot}>
                    <Ionicons
                      name="lock-closed"
                      size={11}
                      color={c.textSecondary}
                    />
                  </View>
                )}
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                <Text
                  style={[styles.badgeLabel, { color: b.earned ? col : c.textSecondary }]}
                  numberOfLines={1}
                >
                  {t(b.labelKey, b.labelParams)}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {t(b.descKey, b.descParams)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    body: { padding: 16, paddingBottom: 48 },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
    toggleHint: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: 0.3,
      marginTop: 24,
    },
    sectionHint: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    slotsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    slotEmpty: {
      flex: 1,
      aspectRatio: 1.1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    slotFilled: {
      flex: 1,
      aspectRatio: 1.1,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      paddingHorizontal: 6,
    },
    slotEmoji: { fontSize: 28, marginBottom: 4 },
    slotLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    sectionHeadRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    earnedCount: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
    },
    badgeCard: {
      width: '31.5%',
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    selDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockDot: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
    badgeEmoji: { fontSize: 30, marginBottom: 6 },
    badgeLabel: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    badgeDesc: {
      fontSize: 10,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 3,
      lineHeight: 13,
    },
  });
}
