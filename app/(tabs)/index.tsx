import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
import { Profile, Trade, tradeStyleLabel } from '@/lib/types';

type FeedItem = Trade & {
  profile: Profile | null;
};

export default function FeedScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('trades')
      .select(
        `*,
        profile:profiles (
          id,
          email,
          username,
          display_name,
          avatar_url,
          bio,
          trade_style,
          language,
          is_premium,
          nationality,
          is_verified,
          created_at
        )`,
      )
      .eq('is_shared', true)
      .order('traded_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setItems((data ?? []) as FeedItem[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadFeed();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [loadFeed]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>フィード</Text>
            <Text style={styles.subtitle}>共有された取引のタイムライン</Text>
          </View>
          <View style={styles.headerActions}>
            <Link href="/search" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text style={styles.headerButtonIcon}>🔍</Text>
              </Pressable>
            </Link>
            <Link href="/ranking" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text style={styles.headerButtonIcon}>🏆</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>エラー: {error}</Text>
            </View>
          )}

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>まだ投稿がありません</Text>
              <Text style={styles.emptyText}>
                記録タブで「フィードに共有」をオンにして{'\n'}
                取引を保存すると、ここに表示されます。
              </Text>
            </View>
          ) : (
            items.map((item) => <FeedCard key={item.id} item={item} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const profile = item.profile;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile?.nationality ?? null);
  const styleText = profile?.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const directionLabel = item.direction === 'long' ? 'ロング' : 'ショート';
  const resultLabel =
    item.result === 'win' ? '利確' : item.result === 'loss' ? '損切り' : null;
  const date = new Date(item.traded_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const userId = profile?.id ?? item.user_id;

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
        onPress={() => router.push(`/user/${userId}`)}
      >
        <Avatar
          uri={profile?.avatar_url}
          displayName={displayName}
          size={40}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            {profile?.is_verified && (
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
                {country && (
                  <Text style={styles.metaText}>{country.name}</Text>
                )}
              </>
            )}
            {styleText && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <Text style={styles.metaText}>{styleText}</Text>
              </>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.tradeBlock}>
        <View style={styles.tradeHead}>
          <Text style={styles.tradePair}>{item.currency_pair}</Text>
          <Text style={styles.tradeDirection}>{directionLabel}</Text>
          {resultLabel && (
            <View
              style={[
                styles.resultBadge,
                item.result === 'win'
                  ? styles.resultBadgeWin
                  : styles.resultBadgeLoss,
              ]}
            >
              <Text style={styles.resultBadgeText}>{resultLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.tradeNumbers}>
          <Text style={[styles.tradePnl, pnlColor(item.pnl, c)]}>
            {item.pnl !== null ? formatPnl(item.pnl) : '—'}
          </Text>
          {item.pnl_pips !== null && (
            <Text style={[styles.tradePips, pnlColor(item.pnl_pips, c)]}>
              {formatPips(item.pnl_pips)}
            </Text>
          )}
        </View>
      </View>

      {item.memo && item.memo.trim() !== '' && (
        <Text style={styles.memo}>{item.memo}</Text>
      )}

      <Text style={styles.date}>{dateStr}</Text>
    </View>
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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 16,
    },
    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonPressed: {
      opacity: 0.7,
    },
    headerButtonIcon: {
      fontSize: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      padding: 16,
      paddingBottom: 40,
      gap: 12,
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
      marginTop: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    userRowPressed: {
      opacity: 0.7,
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
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    username: {
      fontSize: 12,
      color: c.textSecondary,
    },
    metaSep: {
      fontSize: 12,
      color: c.textSecondary,
    },
    flag: {
      fontSize: 13,
    },
    metaText: {
      fontSize: 12,
      color: c.textSecondary,
    },
    tradeBlock: {
      backgroundColor: c.background,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    tradeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tradePair: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    tradeDirection: {
      fontSize: 13,
      color: c.textSecondary,
    },
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    resultBadgeWin: {
      backgroundColor: c.win,
    },
    resultBadgeLoss: {
      backgroundColor: c.loss,
    },
    resultBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    tradeNumbers: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
    },
    tradePnl: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    tradePips: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
    },
    memo: {
      fontSize: 13,
      color: c.textPrimary,
      marginTop: 10,
      lineHeight: 19,
    },
    date: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: 'right',
    },
  });
}
