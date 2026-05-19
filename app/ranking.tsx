import { Ionicons } from '@expo/vector-icons';
import { Router, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';

type Category = 'pnl' | 'pips' | 'winrate' | 'overall';

type RankingRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nationality: string | null;
  is_verified: boolean | null;
  trade_style: string | null;
  trade_count: number;
  total_pnl: number | null;
  total_pips: number | null;
  win_count: number;
  loss_count: number;
  win_rate: number | null;
  overall_score: number | null;
};

export default function RankingScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const CATEGORIES: { value: Category; label: string }[] = useMemo(
    () => [
      { value: 'overall', label: t('ranking.tabOverall') },
      { value: 'pnl', label: t('ranking.tabPnl') },
      { value: 'pips', label: t('ranking.tabPips') },
      { value: 'winrate', label: t('ranking.tabWinrate') },
    ],
    [t],
  );
  const router = useRouter();
  const [category, setCategory] = useState<Category>('overall');
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_monthly_ranking',
        { top_n: 50, category },
      );
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setRows((data ?? []) as RankingRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}`;
  }, []);

  const description = useMemo(() => {
    switch (category) {
      case 'pnl':
        return t('ranking.descPnl');
      case 'pips':
        return t('ranking.descPips');
      case 'winrate':
        return t('ranking.descWinrate');
      case 'overall':
        return t('ranking.descOverall');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('ranking.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>{monthLabel}</Text>
        <Text style={styles.subDescription}>{description}</Text>
      </View>

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => {
          const selected = category === cat.value;
          return (
            <Pressable
              key={cat.value}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setCategory(cat.value)}
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
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {rows.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                該当するデータがまだありません。
              </Text>
            </View>
          )}

          {rows.map((row, idx) => (
            <RankingRowItem
              key={row.user_id}
              row={row}
              rank={idx + 1}
              category={category}
              router={router}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RankingRowItem({
  row,
  rank,
  category,
  router,
}: {
  row: RankingRow;
  rank: number;
  category: Category;
  router: Router;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = t('profile.defaultName');
  const displayName =
    row.display_name?.trim() || row.username?.trim() || fallbackName;
  const username = row.username?.trim() || fallbackName;
  const flag = row.nationality ? flagEmoji(row.nationality) : '';
  const country = findCountry(row.nationality ?? null);

  const rankStyle =
    rank === 1
      ? styles.rankGold
      : rank === 2
        ? styles.rankSilver
        : rank === 3
          ? styles.rankBronze
          : styles.rankNormal;

  const primaryValue = (() => {
    switch (category) {
      case 'pnl':
        return {
          text:
            row.total_pnl !== null ? formatPnl(row.total_pnl) : '—',
          style: pnlColor(row.total_pnl, c),
        };
      case 'pips':
        return {
          text:
            row.total_pips !== null ? formatPips(row.total_pips) : '—',
          style: pnlColor(row.total_pips, c),
        };
      case 'winrate':
        return {
          text: row.win_rate !== null ? `${row.win_rate}%` : '—',
          style: undefined,
        };
      case 'overall':
        return {
          text:
            row.overall_score !== null
              ? `${(row.overall_score * 100).toFixed(0)}pt`
              : '—',
          style: undefined,
        };
    }
  })();

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/user/${row.user_id}`)}
    >
      <View style={[styles.rankBadge, rankStyle]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <Avatar
        uri={row.avatar_url}
        displayName={displayName}
        size={44}
        profile={{
          username: row.username,
          is_verified: row.is_verified,
          nationality: row.nationality,
          trade_style: row.trade_style,
        }}
        onPress={() => router.push(`/user/${row.user_id}`)}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {row.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.username}>@{username}</Text>
          {flag !== '' && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.flag}>{flag}</Text>
              {country && <Text style={styles.metaText}>{country.name}</Text>}
            </>
          )}
        </View>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.primary, primaryValue.style]}>
          {primaryValue.text}
        </Text>
        <Text style={styles.subStats}>
          {row.trade_count}回
          {row.win_rate !== null && category !== 'winrate'
            ? ` · ${row.win_rate}%`
            : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} pips`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
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
    subHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    subTitle: { fontSize: 22, fontWeight: '700', color: c.textPrimary },
    subDescription: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 6,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    tabSelected: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { fontSize: 12, color: c.textPrimary, fontWeight: '600' },
    tabTextSelected: { color: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 16, paddingBottom: 40, gap: 8 },
    errorBox: { backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8 },
    errorText: { color: '#FECACA', fontSize: 13 },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 32,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 12,
    },
    rowPressed: { opacity: 0.7 },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankNormal: { backgroundColor: c.surfaceAlt },
    rankGold: { backgroundColor: '#F59E0B' },
    rankSilver: { backgroundColor: '#9CA3AF' },
    rankBronze: { backgroundColor: '#B45309' },
    rankText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    displayName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    verifiedBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    username: { fontSize: 11, color: c.textSecondary },
    metaSep: { fontSize: 11, color: c.textSecondary },
    flag: { fontSize: 12 },
    metaText: { fontSize: 11, color: c.textSecondary },
    stats: { alignItems: 'flex-end' },
    primary: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    subStats: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  });
}
