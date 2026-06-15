import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Line as SvgLine, Path, Stop } from 'react-native-svg';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { ProfileLinks } from '@/components/profile-links';
import { ReportModal } from '@/components/report-modal';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBlocks } from '@/hooks/use-blocks';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { formatPips } from '@/lib/format-pips';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Post, PROFILE_COLUMNS, Profile, Trade, tradeStyleLabel } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / 4;

type TabKey = 'posts' | 'trades' | 'predictions' | 'shares' | 'likes';

type UserPred = {
  id: string;
  currency_pair: string;
  direction: 'long' | 'short';
  outcome: 'open' | 'win' | 'loss';
  bull_count: number;
  bear_count: number;
};

type RawPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

export default function UserProfileScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id: targetId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { isBlocked, block, unblock } = useBlocks();
  const myId = session?.user.id ?? null;
  const isMyself = !!myId && myId === targetId;
  const blocked = !!targetId && isBlocked(targetId);
  const [reportVisible, setReportVisible] = useState(false);

  const performBlockToggle = async () => {
    if (!targetId) return;
    try {
      if (blocked) {
        await unblock(targetId);
        return;
      }
      Alert.alert(
        t('user.confirmBlockTitle'),
        t('user.confirmBlockBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('user.block'),
            style: 'destructive',
            onPress: async () => {
              try {
                await block(targetId);
              } catch (e) {
                Alert.alert(
                  t('common.error'),
                  e instanceof Error ? e.message : String(e),
                );
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const handleMenuOpen = () => {
    if (!targetId || isMyself) return;
    const blockLabel = blocked ? t('user.unblock') : t('user.block');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), blockLabel, t('user.report')],
          destructiveButtonIndex: blocked ? 2 : [1, 2],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) performBlockToggle();
          if (buttonIndex === 2) setReportVisible(true);
        },
      );
      return;
    }
    Alert.alert(t('user.options'), undefined, [
      {
        text: blockLabel,
        style: blocked ? 'default' : 'destructive',
        onPress: performBlockToggle,
      },
      {
        text: t('user.report'),
        style: 'destructive',
        onPress: () => setReportVisible(true),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('posts');
  const [items, setItems] = useState<FeedCardItem[]>([]);
  const [userPredictions, setUserPredictions] = useState<UserPred[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const decorateItems = useCallback(
    async (rawPosts: RawPost[]): Promise<FeedCardItem[]> => {
      if (!myId || rawPosts.length === 0) {
        return rawPosts.map((p) => ({
          ...p,
          is_liked: false,
          is_bookmarked: false,
          is_reposted: false,
        }));
      }
      const postIds = rawPosts.map((p) => p.id);
      const [likesRes, bmRes, rpRes] = await Promise.all([
        supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', myId)
          .in('post_id', postIds),
        supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', myId)
          .in('post_id', postIds),
        supabase
          .from('reposts')
          .select('post_id')
          .eq('user_id', myId)
          .in('post_id', postIds),
      ]);
      const likedSet = new Set(
        (likesRes.data ?? []).map((l: { post_id: string }) => l.post_id),
      );
      const bookmarkedSet = new Set(
        (bmRes.data ?? []).map((l: { post_id: string }) => l.post_id),
      );
      const repostedSet = new Set(
        (rpRes.data ?? []).map((l: { post_id: string }) => l.post_id),
      );
      return rawPosts.map((p) => ({
        ...p,
        is_liked: likedSet.has(p.id),
        is_bookmarked: bookmarkedSet.has(p.id),
        is_reposted: repostedSet.has(p.id),
      }));
    },
    [myId],
  );

  const loadTab = useCallback(
    async (which: TabKey) => {
      if (!targetId || which === 'trades') {
        setItems([]);
        return;
      }
      setTabLoading(true);
      try {
        if (which === 'posts') {
          const { data } = await supabase
            .from('posts')
            .select(
              `*,
              trade:trades!posts_trade_id_fkey (*),
              profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})`,
            )
            .eq('user_id', targetId)
            .in('post_type', ['text', 'strategy'])
            .order('created_at', { ascending: false })
            .limit(50);
          const decorated = await decorateItems((data ?? []) as RawPost[]);
          setItems(decorated);
        } else if (which === 'likes') {
          // 他人のいいねはRLSで読めない場合がある → 空表示で握りつぶす
          try {
            const { data, error: likesError } = await supabase
              .from('likes')
              .select(
                `created_at,
                post:posts!likes_post_id_fkey (
                  *,
                  trade:trades!posts_trade_id_fkey (*),
                  profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})
                )`,
              )
              .eq('user_id', targetId)
              .order('created_at', { ascending: false })
              .limit(50);
            if (likesError) {
              setItems([]);
            } else {
              type Row = { post: RawPost | null };
              const posts = ((data ?? []) as unknown as Row[])
                .map((r) => r.post)
                .filter((p): p is RawPost => p !== null);
              const decorated = await decorateItems(posts);
              setItems(decorated);
            }
          } catch {
            setItems([]);
          }
        } else if (which === 'predictions') {
          const { data } = await supabase.rpc('get_predictions', {
            top_n: 50,
            p_user: targetId,
          });
          setUserPredictions((data ?? []) as UserPred[]);
        } else {
          // shares (reposts)
          const { data } = await supabase
            .from('reposts')
            .select(
              `created_at,
              post:posts!reposts_post_id_fkey (
                *,
                trade:trades!posts_trade_id_fkey (*),
                profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})
              )`,
            )
            .eq('user_id', targetId)
            .order('created_at', { ascending: false })
            .limit(50);
          type Row = { post: RawPost | null };
          const posts = ((data ?? []) as unknown as Row[])
            .map((r) => r.post)
            .filter((p): p is RawPost => p !== null);
          const decorated = await decorateItems(posts);
          setItems(decorated);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert(t('profile.loadFail'), msg);
      } finally {
        setTabLoading(false);
      }
    },
    [targetId, decorateItems, t],
  );

  const switchTab = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    setItems([]);
    loadTab(next);
  };

  const toggleLike = async (item: FeedCardItem) => {
    if (!myId) return;
    const wasLiked = item.is_liked;
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? {
              ...p,
              is_liked: !wasLiked,
              likes_count: Math.max(0, p.likes_count + (wasLiked ? -1 : 1)),
            }
          : p,
      ),
    );
    try {
      if (wasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
      } else {
        await supabase.from('likes').insert({ user_id: myId, post_id: item.id });
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                is_liked: wasLiked,
                likes_count: Math.max(0, p.likes_count + (wasLiked ? 1 : -1)),
              }
            : p,
        ),
      );
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const toggleBookmark = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_bookmarked;
    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_bookmarked: !was } : p)),
    );
    try {
      if (was) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: myId, post_id: item.id });
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_bookmarked: was } : p)),
      );
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const toggleRepost = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_reposted;
    if (!was) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(t('feed.confirmRepostTitle'), t('feed.confirmRepostBody'), [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('feed.repost'), onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_reposted: !was } : p)),
    );
    try {
      if (was) {
        await supabase
          .from('reposts')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
      } else {
        await supabase
          .from('reposts')
          .upsert(
            { user_id: myId, post_id: item.id },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          );
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_reposted: was } : p)),
      );
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const load = useCallback(async () => {
    if (!targetId) {
      setError(t('user.idNotSpecified'));
      setLoading(false);
      return;
    }
    setError(null);

    try {
      const [profileRes, followerRes, followingRes, tradesRes, isFollowingRes] =
        await Promise.all([
          supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', targetId).maybeSingle(),
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
            .limit(300),
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [targetId, myId, isMyself]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadTab(tab);
    }, [load, loadTab, tab]),
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
      Alert.alert(t('common.error'), msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
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
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error ?? t('user.notFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fallbackName = profile.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    profile.display_name?.trim() ||
    profile.username?.trim() ||
    fallbackName;
  const username = profile.username?.trim() || fallbackName;
  const flag = profile.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile.nationality ?? null);
  const styleText = profile.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const tabs: {
    key: TabKey;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'trades', icon: 'bar-chart-outline' },
    { key: 'predictions', icon: 'pulse-outline' },
    { key: 'shares', icon: 'repeat' },
    { key: 'likes', icon: 'heart-outline' },
  ];

  const emptyIcon: React.ComponentProps<typeof Ionicons>['name'] =
    tab === 'posts'
      ? 'grid-outline'
      : tab === 'shares'
        ? 'repeat'
        : 'heart-outline';

  const emptyTitle =
    tab === 'posts'
      ? t('profile.emptyPosts')
      : tab === 'shares'
        ? t('profile.emptyShares')
        : t('profile.emptyLikes');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          @{username}
        </Text>
        {!isMyself ? (
          <Pressable onPress={handleMenuOpen} hitSlop={12}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={c.textPrimary}
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {targetId && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType="user"
          targetId={targetId}
        />
      )}

      <ScrollView contentContainerStyle={styles.body}>
        {profile.banner_url ? (
          <Image
            source={{ uri: profile.banner_url }}
            style={styles.userBanner}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.userBanner, { backgroundColor: c.surfaceAlt }]} />
        )}
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

          <ProfileLinks
            website={profile.website}
            youtube={profile.youtube}
          />

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
                    {isFollowing ? t('user.followingBtn') : t('user.followBtn')}
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
                <Text style={styles.messageButtonText}>{t('user.message')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trades.length}</Text>
            <Text style={styles.statLabel}>{t('profile.sharedTrades')}</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.statItem,
              pressed && styles.statItemPressed,
            ]}
            onPress={() =>
              targetId &&
              router.push(`/follow-list?userId=${targetId}&tab=followers`)
            }
          >
            <Text style={styles.statValue}>{followerCount}</Text>
            <Text style={styles.statLabel}>{t('profile.followers')}</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.statItem,
              pressed && styles.statItemPressed,
            ]}
            onPress={() =>
              targetId &&
              router.push(`/follow-list?userId=${targetId}&tab=following`)
            }
          >
            <Text style={styles.statValue}>{followingCount}</Text>
            <Text style={styles.statLabel}>{t('profile.following')}</Text>
          </Pressable>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tb) => {
            const active = tab === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => switchTab(tb.key)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                hitSlop={4}
              >
                <Ionicons
                  name={tb.icon}
                  size={22}
                  color={active ? c.accent : c.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>
          {tab === 'trades' ? (
            trades.length === 0 ? (
              <EmptyState
                icon="bar-chart-outline"
                title={t('profile.emptyTrades')}
                subtitle=""
              />
            ) : (
              <>
                <UserPerformance trades={trades} />
                <Text style={styles.recentLabel}>{t('analytics.recentTrades')}</Text>
                {trades.slice(0, 8).map((tr) => (
                  <TradeCard key={tr.id} trade={tr} />
                ))}
              </>
            )
          ) : tab === 'predictions' ? (
            tabLoading ? (
              <View style={styles.tabCenter}>
                <ActivityIndicator color={c.accent} />
              </View>
            ) : userPredictions.length === 0 ? (
              <EmptyState icon="pulse-outline" title={t('predictions.empty')} subtitle="" />
            ) : (
              userPredictions.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.predRow}
                  onPress={() => router.push(`/prediction/${p.id}`)}
                >
                  <Text style={styles.predPair}>{p.currency_pair}</Text>
                  <View
                    style={[
                      styles.predDir,
                      { backgroundColor: p.direction === 'long' ? c.win : c.loss },
                    ]}
                  >
                    <Text style={styles.predDirText}>
                      {p.direction === 'long' ? t('common.long') : t('common.short')}
                    </Text>
                  </View>
                  {p.outcome !== 'open' && (
                    <View
                      style={[
                        styles.predOutcome,
                        { backgroundColor: p.outcome === 'win' ? c.win : c.loss },
                      ]}
                    >
                      <Text style={styles.predDirText}>
                        {p.outcome === 'win' ? t('predictions.win') : t('predictions.loss')}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <Ionicons name="trending-up" size={14} color={c.win} />
                  <Text style={styles.predCount}>{p.bull_count}</Text>
                  <Ionicons name="trending-down" size={14} color={c.loss} />
                  <Text style={styles.predCount}>{p.bear_count}</Text>
                  <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
                </Pressable>
              ))
            )
          ) : tabLoading ? (
            <View style={styles.tabCenter}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              subtitle=""
            />
          ) : (
            items.map((item) => (
              <FeedCard
                key={`${tab}-${item.id}`}
                item={item}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
                onToggleRepost={toggleRepost}
                onDeleted={(postId) =>
                  setItems((prev) => prev.filter((p) => p.id !== postId))
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EquityCurve({
  points,
  color,
  width,
  height,
}: {
  points: number[];
  color: string;
  width: number;
  height: number;
}) {
  if (points.length < 2) return null;
  const pad = 6;
  const innerH = height - pad * 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => pad + innerH - ((v - min) / range) * innerH;
  const coords = points.map((v, i) => ({ x: i * stepX, y: toY(v) }));
  const line = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const zeroY = toY(0);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="userEquityFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {min < 0 && max > 0 ? (
        <SvgLine
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="rgba(127,127,127,0.4)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ) : null}
      <Path d={area} fill="url(#userEquityFill)" />
      <Path
        d={line}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function UserPerformance({ trades }: { trades: Trade[] }) {
  const c = useThemeColors();
  const { t } = useI18n();
  const { profile: viewer } = useProfile();
  const currency = viewer?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const cardWidth = Dimensions.get('window').width - 64;

  const s = useMemo(() => {
    const withPnl = trades.filter((t) => t.pnl !== null);
    const sorted = [...withPnl].sort(
      (a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
    );
    const total = withPnl.reduce((x, t) => x + (t.pnl ?? 0), 0);
    const withResult = trades.filter((t) => t.result !== null);
    const wins = withResult.filter((t) => t.result === 'win').length;
    const winRate =
      withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : null;
    const grossWin = withPnl
      .filter((t) => (t.pnl ?? 0) > 0)
      .reduce((x, t) => x + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(
      withPnl.filter((t) => (t.pnl ?? 0) < 0).reduce((x, t) => x + (t.pnl ?? 0), 0),
    );
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;
    const curve: number[] = [0];
    let acc = 0;
    for (const t of sorted) {
      acc += t.pnl ?? 0;
      curve.push(acc);
    }
    return { count: trades.length, total, winRate, pf, curve, hasPnl: withPnl.length > 0 };
  }, [trades]);

  const totalColor = s.total > 0 ? c.win : s.total < 0 ? c.loss : c.textPrimary;
  const curveColor = s.total >= 0 ? c.win : c.loss;

  return (
    <View style={styles.perfCard}>
      {s.curve.length >= 3 ? (
        <View style={styles.perfCurveWrap}>
          <EquityCurve
            points={s.curve}
            color={curveColor}
            width={cardWidth - 32}
            height={110}
          />
        </View>
      ) : null}
      <View style={styles.perfGrid}>
        <View style={styles.perfCell}>
          <Text style={styles.perfLabel}>{t('stats.total_pnl')}</Text>
          <Text style={[styles.perfValue, { color: totalColor }]}>
            {s.hasPnl ? formatPnlWithCurrency(s.total, currency) : '—'}
          </Text>
        </View>
        <View style={styles.perfCell}>
          <Text style={styles.perfLabel}>{t('stats.win_rate')}</Text>
          <Text style={styles.perfValue}>
            {s.winRate === null ? '—' : `${s.winRate}%`}
          </Text>
        </View>
        <View style={styles.perfCell}>
          <Text style={styles.perfLabel}>{t('profile.sharedTrades')}</Text>
          <Text style={styles.perfValue}>{s.count}</Text>
        </View>
        <View style={styles.perfCell}>
          <Text style={styles.perfLabel}>{t('stats.profit_factor')}</Text>
          <Text style={styles.perfValue}>
            {s.pf === null ? '—' : s.pf === Infinity ? '∞' : s.pf.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const c = useThemeColors();
  const { t } = useI18n();
  const { profile: viewerProfile } = useProfile();
  const currency = viewerProfile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const directionLabel = trade.direction === 'long' ? t('common.long') : t('common.short');
  const resultLabel =
    trade.result === 'win' ? t('common.win') : trade.result === 'loss' ? t('common.loss') : null;
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
          {trade.pnl !== null ? formatPnlWithCurrency(trade.pnl, currency) : '—'}
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

// formatPnl は formatPnlWithCurrency(n, currency) に置換済み


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
    userBanner: {
      width: '100%',
      aspectRatio: 3,
      borderRadius: 14,
      marginBottom: 12,
    },
    profileCard: {
      backgroundColor: c.surface,
      borderRadius: 10,
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
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 14,
      justifyContent: 'center',
    },
    badgeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1.5,
      backgroundColor: c.surfaceAlt,
    },
    badgeEmoji: { fontSize: 13 },
    badgeLabel: { fontSize: 11, fontWeight: '700' },
    perfCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    perfCurveWrap: { alignItems: 'center', marginBottom: 12 },
    perfGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    perfCell: { width: '50%', paddingVertical: 8 },
    perfLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 2 },
    perfValue: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    recentLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 10,
      marginTop: 4,
    },
    verifiedBadge: {
      width: 20,
      height: 20,
      borderRadius: 8,
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
      borderRadius: 10,
      paddingVertical: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statItemPressed: {
      opacity: 0.5,
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
    tabBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      width: SCREEN_WIDTH,
      height: 52,
      marginHorizontal: -16,
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabButton: {
      width: TAB_WIDTH,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: c.accent,
    },
    tabContent: {
      gap: 10,
    },
    tabCenter: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    predRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    predPair: { fontSize: 15, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.3 },
    predDir: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    predOutcome: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    predDirText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    predCount: { fontSize: 13, fontWeight: '700', color: c.textPrimary, marginRight: 4 },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    tradeCard: {
      backgroundColor: c.surface,
      borderRadius: 10,
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
      borderRadius: 10,
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
