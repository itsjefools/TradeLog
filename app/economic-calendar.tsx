import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import {
  ECONOMIC_EVENTS,
  EconomicEvent,
  importanceColor,
  importanceLabel,
} from '@/lib/economic-events';

type CountryFilter = 'all' | 'US' | 'JP' | 'EU';

export default function EconomicCalendarScreen() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [filter, setFilter] = useState<CountryFilter>('all');
  const [highOnly, setHighOnly] = useState(false);

  const events = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return ECONOMIC_EVENTS.filter((e) => e.date >= today)
      .filter((e) => filter === 'all' || e.country === filter)
      .filter((e) => !highOnly || e.importance === 'high')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  }, [filter, highOnly]);

  // 日付でグループ化
  const grouped = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [events]);

  const filters: { value: CountryFilter; label: string }[] = [
    { value: 'all', label: t('economicCalendar.filterAll') },
    { value: 'US', label: t('economicCalendar.filterUS') },
    { value: 'JP', label: t('economicCalendar.filterJP') },
    { value: 'EU', label: t('economicCalendar.filterEU') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('economicCalendar.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => {
          const selected = filter === f.value;
          return (
            <Pressable
              key={f.value}
              style={[styles.filter, selected && styles.filterSelected]}
              onPress={() => setFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.filter, highOnly && styles.filterSelected]}
          onPress={() => setHighOnly((v) => !v)}
        >
          <Text
            style={[styles.filterText, highOnly && styles.filterTextSelected]}
          >
            {t('economicCalendar.highOnly')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {grouped.length === 0 ? (
          <Text style={styles.empty}>{t('economicCalendar.empty')}</Text>
        ) : (
          grouped.map(([date, list]) => (
            <View key={date} style={styles.dayGroup}>
              <Text style={styles.dayLabel}>{formatDate(date, locale)}</Text>
              {list.map((e) => (
                <View key={e.id} style={styles.eventCard}>
                  <View style={styles.eventHead}>
                    <Text style={styles.flag}>{e.flag}</Text>
                    <View
                      style={[
                        styles.impDot,
                        { backgroundColor: importanceColor(e.importance) },
                      ]}
                    />
                    <Text style={styles.impText}>
                      {importanceLabel(e.importance)}
                    </Text>
                    {e.time && (
                      <Text style={styles.eventTime}>{e.time}</Text>
                    )}
                  </View>
                  <Text style={styles.eventName}>{e.name}</Text>
                  {e.description && (
                    <Text style={styles.eventDesc}>{e.description}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={styles.disclaimer}>{t('economicCalendar.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string, _locale: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    filter: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterSelected: { backgroundColor: c.accent, borderColor: c.accent },
    filterText: { fontSize: 12, color: c.textPrimary, fontWeight: '600' },
    filterTextSelected: { color: '#fff' },
    body: { padding: 16, paddingBottom: 40, gap: 16 },
    empty: {
      paddingVertical: 32,
      textAlign: 'center',
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
    },
    dayGroup: { gap: 6 },
    dayLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 4,
    },
    eventCard: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    eventHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    flag: { fontSize: 18 },
    impDot: { width: 8, height: 8, borderRadius: 8 },
    impText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    eventTime: {
      marginLeft: 'auto',
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
    },
    eventName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    eventDesc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    disclaimer: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: 8,
    },
  });
}
