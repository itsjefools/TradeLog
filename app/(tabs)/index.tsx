import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Profile, Trade, tradeStyleLabel } from '@/lib/types';

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_SECONDARY = '#94A3B8';
const WIN_COLOR = '#10B981';
const LOSS_COLOR = '#EF4444';
const VERIFIED_COLOR = '#3B82F6';

type FeedItem = Trade & {
  profile: Profile | null;
};

export default function FeedScreen() {
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
        <Text style={styles.title}>フィード</Text>
        <Text style={styles.subtitle}>共有された取引のタイムライン</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
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
  const profile = item.profile;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;
  const initial = (displayName.charAt(0) || '?').toUpperCase();
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile?.nationality ?? null);
  const styleText = profile?.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const directionLabel = item.direction === 'long' ? 'ロング' : 'ショート';
  const resultLabel =
    item.result === 'win' ? '利確' : item.result === 'loss' ? '損切り' : null;
  const date = new Date(item.traded_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <View style={styles.card}>
      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
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
      </View>

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
          <Text style={[styles.tradePnl, pnlColor(item.pnl)]}>
            {item.pnl !== null ? formatPnl(item.pnl) : '—'}
          </Text>
          {item.pnl_pips !== null && (
            <Text style={[styles.tradePips, pnlColor(item.pnl_pips)]}>
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

function pnlColor(n: number | null): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? WIN_COLOR : LOSS_COLOR };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
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
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
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
    color: TEXT_PRIMARY,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: VERIFIED_COLOR,
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
    color: TEXT_SECONDARY,
  },
  metaSep: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  flag: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  tradeBlock: {
    backgroundColor: BACKGROUND,
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
    color: TEXT_PRIMARY,
  },
  tradeDirection: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultBadgeWin: {
    backgroundColor: WIN_COLOR,
  },
  resultBadgeLoss: {
    backgroundColor: LOSS_COLOR,
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
    color: TEXT_PRIMARY,
  },
  tradePips: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  memo: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    marginTop: 10,
    lineHeight: 19,
  },
  date: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'right',
  },
});
