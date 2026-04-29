import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Profile, Trade, tradeStyleLabel } from '@/lib/types';

export default function UserProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id: targetId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const isMyself = !!myId && myId === targetId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!targetId) return;
    setError(null);

    const [profileRes, followerRes, followingRes, tradesRes, isFollowingRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetId).maybeSingle(),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetId),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetId),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', targetId)
          .eq('is_shared', true)
          .order('traded_at', { ascending: false })
          .limit(20),
        myId && !isMyself
          ? supabase
              .from('follows')
              .select('follower_id')
              .eq('follower_id', myId)
              .eq('following_id', targetId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
    } else {
      setProfile((profileRes.data ?? null) as Profile | null);
    }
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
    setTrades((tradesRes.data ?? []) as Trade[]);
    setIsFollowing(!!isFollowingRes.data);
    setLoading(false);
  }, [targetId, myId, isMyself]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleFollow = async () => {
    if (!myId || isMyself || actionLoading) return;
    setActionLoading(true);
    try {
      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myId)
          .eq('following_id', targetId);
        if (deleteError) throw new Error(deleteError.message);
        setIsFollowing(false);
        setFollowerCount((n) => Math.max(0, n - 1));
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({ follower_id: myId, following_id: targetId });
        if (insertError) throw new Error(insertError.message);
        setIsFollowing(true);
        setFollowerCount((n) => n + 1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('エラー', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.headerLink}>← 戻る</Text>
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile || error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.headerLink}>← 戻る</Text>
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error ?? 'ユーザーが見つかりません'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fallbackName = profile.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile.display_name?.trim() ||
    profile.username?.trim() ||
    fallbackName;
  const username = profile.username?.trim() || fallbackName;
  const flag = profile.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile.nationality ?? null);
  const styleText = profile.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>← 戻る</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          @{username}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profileCard}>
          <Avatar
            uri={profile.avatar_url}
            displayName={displayName}
            size={80}
            profile={profile}
          />
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {profile.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{username}</Text>

          <View style={styles.metaRow}>
            {flag !== '' && (
              <View style={styles.metaItem}>
                <Text style={styles.flag}>{flag}</Text>
                <Text style={styles.metaText}>
                  {country?.name ?? profile.nationality ?? ''}
                </Text>
              </View>
            )}
            {profile.trade_style && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>📊</Text>
                <Text style={styles.metaText}>{styleText}</Text>
              </View>
            )}
          </View>

          {profile.bio && profile.bio.trim() !== '' && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {!isMyself && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={toggleFollow}
                disabled={actionLoading}
                style={({ pressed }) => [
                  styles.followButton,
                  isFollowing && styles.followButtonActive,
                  pressed && styles.followButtonPressed,
                  actionLoading && styles.followButtonDisabled,
                ]}
              >
                {actionLoading ? (
                  <ActivityIndicator
                    color={isFollowing ? c.textPrimary : '#fff'}
                  />
                ) : (
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowing && styles.followButtonTextActive,
                    ]}
                  >
                    {isFollowing ? 'フォロー中' : '+ フォロー'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push(`/dm/${targetId}`)}
                style={({ pressed }) => [
                  styles.messageButton,
                  pressed && styles.messageButtonPressed,
                ]}
              >
                <Text style={styles.messageButtonText}>メッセージ</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trades.length}</Text>
            <Text style={styles.statLabel}>共有取引</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followerCount}</Text>
            <Text style={styles.statLabel}>フォロワー</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followingCount}</Text>
            <Text style={styles.statLabel}>フォロー中</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>共有された取引</Text>

        {trades.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              共有された取引はまだありません。
            </Text>
          </View>
        ) : (
          trades.map((t) => <TradeCard key={t.id} trade={t} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const directionLabel = trade.direction === 'long' ? 'ロング' : 'ショート';
  const resultLabel =
    trade.result === 'win' ? '利確' : trade.result === 'loss' ? '損切り' : null;
  const date = new Date(trade.traded_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeHead}>
        <Text style={styles.tradePair}>{trade.currency_pair}</Text>
        <Text style={styles.tradeDirection}>{directionLabel}</Text>
        {resultLabel && (
          <View
            style={[
              styles.resultBadge,
              trade.result === 'win'
                ? styles.resultBadgeWin
                : styles.resultBadgeLoss,
            ]}
          >
            <Text style={styles.resultBadgeText}>{resultLabel}</Text>
          </View>
        )}
        <Text style={styles.tradeDate}>{dateStr}</Text>
      </View>
      <View style={styles.tradeNumbers}>
        <Text style={[styles.tradePnl, pnlColor(trade.pnl, c)]}>
          {trade.pnl !== null ? formatPnl(trade.pnl) : '—'}
        </Text>
        {trade.pnl_pips !== null && (
          <Text style={[styles.tradePips, pnlColor(trade.pnl_pips, c)]}>
            {formatPips(trade.pnl_pips)}
          </Text>
        )}
      </View>
      {trade.memo && trade.memo.trim() !== '' && (
        <Text style={styles.memo}>{trade.memo}</Text>
      )}
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
      color: c.accent,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 56,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: c.textSecondary,
      fontSize: 14,
    },
    body: {
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },
    profileCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    displayName: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    verifiedBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    username: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
      justifyContent: 'center',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    flag: {
      fontSize: 18,
    },
    metaLabel: {
      fontSize: 14,
    },
    metaText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    bio: {
      fontSize: 14,
      color: c.textPrimary,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 20,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    followButton: {
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: c.accent,
      borderWidth: 1,
      borderColor: c.accent,
      minWidth: 140,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    messageButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    messageButtonPressed: {
      opacity: 0.7,
    },
    messageButtonText: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    followButtonActive: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
    },
    followButtonPressed: {
      opacity: 0.85,
    },
    followButtonDisabled: {
      opacity: 0.6,
    },
    followButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    followButtonTextActive: {
      color: c.textPrimary,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingVertical: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    sectionLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    tradeCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
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
    tradeDate: {
      marginLeft: 'auto',
      fontSize: 11,
      color: c.textSecondary,
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
      marginTop: 4,
      lineHeight: 19,
    },
  });
}
