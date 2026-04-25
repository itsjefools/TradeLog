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
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';

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
};

export default function RankingScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('get_monthly_ranking', {
      top_n: 50,
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as RankingRow[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>月間ランキング</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>{monthLabel}</Text>
        <Text style={styles.subDescription}>P&L 合計順 (上位50件)</Text>
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
                今月はまだ取引がありません。{'\n'}
                記録タブから取引を追加してください。
              </Text>
            </View>
          )}

          {rows.map((row, idx) => (
            <RankingRowItem
              key={row.user_id}
              row={row}
              rank={idx + 1}
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
  router,
}: {
  row: RankingRow;
  rank: number;
  router: Router;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = 'ユーザー';
  const displayName =
    row.display_name?.trim() ||
    row.username?.trim() ||
    fallbackName;
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

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/user/${row.user_id}`)}
    >
      <View style={[styles.rankBadge, rankStyle]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <Avatar uri={row.avatar_url} displayName={displayName} size={44} />
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
        <Text style={[styles.pnl, pnlColor(row.total_pnl, c)]}>
          {row.total_pnl !== null ? formatPnl(row.total_pnl) : '—'}
        </Text>
        <Text style={styles.subStats}>
          {row.trade_count}回
          {row.win_rate !== null ? ` · 勝率${row.win_rate}%` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: {
      fontSize: 15,
      color: c.textSecondary,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    subHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    subTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: c.textPrimary,
    },
    subDescription: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      padding: 16,
      paddingBottom: 40,
      gap: 8,
    },
    errorBox: {
      backgroundColor: '#7F1D1D',
      padding: 12,
      borderRadius: 8,
    },
    errorText: {
      color: '#FECACA',
      fontSize: 13,
    },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankNormal: {
      backgroundColor: c.surfaceAlt,
    },
    rankGold: {
      backgroundColor: '#F59E0B',
    },
    rankSilver: {
      backgroundColor: '#9CA3AF',
    },
    rankBronze: {
      backgroundColor: '#B45309',
    },
    rankText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    userInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    displayName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    verifiedBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#fff',
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    username: {
      fontSize: 11,
      color: c.textSecondary,
    },
    metaSep: {
      fontSize: 11,
      color: c.textSecondary,
    },
    flag: {
      fontSize: 12,
    },
    metaText: {
      fontSize: 11,
      color: c.textSecondary,
    },
    stats: {
      alignItems: 'flex-end',
    },
    pnl: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    subStats: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
}
