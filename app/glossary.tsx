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
import { useThemeColors } from '@/hooks/use-theme';
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  GlossaryTerm,
} from '@/lib/glossary';

type CategoryFilter = 'all' | GlossaryTerm['category'];

export default function GlossaryScreen() {
  const c = useThemeColors();
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
    { value: 'all', label: 'すべて' },
    ...Object.entries(GLOSSARY_CATEGORIES).map(([k, v]) => ({
      value: k as GlossaryTerm['category'],
      label: v,
    })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>用語集</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="用語を検索（例: pip, RSI, レバレッジ）"
          placeholderTextColor={c.textSecondary}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => {
          const selected = filter === cat.value;
          return (
            <Pressable
              key={cat.value}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setFilter(cat.value)}
            >
              <Text
                style={[
                  styles.tabText,
                  selected && styles.tabTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>該当する用語がありません</Text>
        ) : (
          filtered.map((g) => (
            <View key={g.term} style={styles.termCard}>
              <View style={styles.termHead}>
                <Text style={styles.termText}>{g.term}</Text>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>
                    {GLOSSARY_CATEGORIES[g.category]}
                  </Text>
                </View>
              </View>
              {g.reading && (
                <Text style={styles.termReading}>{g.reading}</Text>
              )}
              <Text style={styles.termDef}>{g.definition}</Text>
            </View>
          ))
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    searchBox: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchInput: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: c.textPrimary,
    },
    tabsScroll: {
      flexGrow: 0,
    },
    tabsContent: {
      paddingHorizontal: 16,
      gap: 6,
      paddingBottom: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabSelected: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { fontSize: 12, color: c.textPrimary, fontWeight: '600' },
    tabTextSelected: { color: '#fff' },
    body: { padding: 16, paddingBottom: 40, gap: 8 },
    empty: {
      paddingVertical: 32,
      textAlign: 'center',
      fontSize: 13,
      color: c.textSecondary,
    },
    termCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    termHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    termText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    categoryChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
      marginLeft: 'auto',
    },
    categoryChipText: {
      fontSize: 10,
      color: c.textSecondary,
      fontWeight: '600',
    },
    termReading: {
      fontSize: 12,
      color: c.textSecondary,
    },
    termDef: {
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 19,
    },
  });
}
