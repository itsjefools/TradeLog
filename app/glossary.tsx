import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  GlossaryTerm,
} from '@/lib/glossary';

type CategoryFilter = 'all' | GlossaryTerm['category'];
type IoniconName = keyof typeof Ionicons.glyphMap;

// カテゴリごとの色とアイコン（視認性・回遊性アップ）
const CATEGORY_META: Record<
  GlossaryTerm['category'],
  { color: string; icon: IoniconName }
> = {
  basic: { color: '#6366F1', icon: 'book-outline' },
  order: { color: '#3B82F6', icon: 'swap-horizontal-outline' },
  analysis: { color: '#10B981', icon: 'trending-up-outline' },
  risk: { color: '#F59E0B', icon: 'shield-checkmark-outline' },
  psychology: { color: '#8B5CF6', icon: 'sparkles-outline' },
};

export default function GlossaryScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((g) => {
      if (filter !== 'all' && g.category !== filter) return false;
      if (q === '') return true;
      return (
        g.term.toLowerCase().includes(q) ||
        (g.reading?.toLowerCase().includes(q) ?? false) ||
        g.definition.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: t('glossary.filterAll') },
    ...Object.entries(GLOSSARY_CATEGORIES).map(([k, v]) => ({
      value: k as GlossaryTerm['category'],
      label: v,
    })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('glossary.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={c.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('glossary.searchPlaceholder')}
          placeholderTextColor={c.textSecondary}
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={c.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => {
          const selected = filter === cat.value;
          const meta =
            cat.value === 'all' ? null : CATEGORY_META[cat.value];
          const accent = meta?.color ?? c.accent;
          return (
            <Pressable
              key={cat.value}
              style={[
                styles.tab,
                selected && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setFilter(cat.value)}
            >
              {meta && (
                <Ionicons
                  name={meta.icon}
                  size={13}
                  color={selected ? '#fff' : accent}
                />
              )}
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.count}>
          {t('glossary.count', { count: filtered.length })}
        </Text>
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="search-outline"
              size={36}
              color={c.textSecondary}
              style={{ opacity: 0.4 }}
            />
            <Text style={styles.empty}>{t('glossary.empty')}</Text>
          </View>
        ) : (
          filtered.map((g) => {
            const meta = CATEGORY_META[g.category];
            return (
              <View key={g.term} style={styles.termCard}>
                <View style={[styles.accentBar, { backgroundColor: meta.color }]} />
                <View style={styles.termInner}>
                  <View style={styles.termHead}>
                    <Text style={styles.termText}>{g.term}</Text>
                    <View
                      style={[
                        styles.categoryChip,
                        { backgroundColor: `${meta.color}1A` },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={11} color={meta.color} />
                      <Text style={[styles.categoryChipText, { color: meta.color }]}>
                        {GLOSSARY_CATEGORIES[g.category]}
                      </Text>
                    </View>
                  </View>
                  {g.reading && (
                    <Text style={styles.termReading}>{g.reading}</Text>
                  )}
                  <Text style={styles.termDef}>{g.definition}</Text>
                </View>
              </View>
            );
          })
        )}
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
    headerSpacer: { width: 40 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
      padding: 0,
    },
    tabsScroll: { flexGrow: 0, marginTop: 12 },
    tabsContent: {
      paddingHorizontal: 16,
      gap: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabText: {
      fontSize: 13,
      lineHeight: 17,
      color: c.textPrimary,
      fontWeight: '600',
      includeFontPadding: false,
    },
    tabTextSelected: { color: '#fff' },
    body: { padding: 16, paddingBottom: 40, gap: 12 },
    count: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    empty: {
      textAlign: 'center',
      fontSize: 14,
      color: c.textSecondary,
    },
    termCard: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    accentBar: { width: 4 },
    termInner: { flex: 1, padding: 16, gap: 6 },
    termHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    termText: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    categoryChipText: {
      fontSize: 10,
      fontWeight: '700',
    },
    termReading: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    termDef: {
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 21,
      opacity: 0.85,
    },
  });
}
