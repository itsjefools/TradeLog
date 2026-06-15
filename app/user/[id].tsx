import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line as SvgLine, Path, Rect, Stop } from 'react-native-svg';

import { Avatar } from '@/components/avatar';
import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { ProfileLinks } from '@/components/profile-links';
import { ReportModal } from '@/components/report-modal';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBlocks } from '@/hooks/use-blocks';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { formatPips } from '@/lib/format-pips';
import { formatPnlCompact, formatPnlWithCurrency } from '@/lib/format-currency';
import {
  formatUserStat,
  resolveShowcaseStats,
  STAT_LABEL_KEY,
  UserStatsRow,
} from '@/lib/profile-stats';
import { supabase } from '@/lib/supabase';
import { Post, PROFILE_COLUMNS, Profile, Trade, tradeStyleLabel } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / 4;

type TabKey = 'posts' | 'records' | 'predictions' | 'shares';
const TAB_ORDER: TabKey[] = ['posts', 'records', 'predictions', 'shares'];
const TAB_ICON: Record<TabKey, React.ComponentProps<typeof Ionicons>['name']> = {
  posts: 'grid-outline',
  records: 'stats-chart-outline',
  predictions: 'pulse-outline',
  shares: 'repeat',
};

type UserPred = {
  id: string;
  currency_pair: string;
  direction: 'long' | 'short';
  outcome: 'open' | 'win' | 'loss';
  bull_count: number;
  bear_count: number;
};

type SeriesRow = { bucket: string; pnl: number; trade_count: number };
type PairRow = { currency_pair: string; pnl: number; trade_count: number };
type PerfSummary = {
  win_rate: number | null;
  trade_count: number | null;
  win_count: number | null;
  loss_count: number | null;
  cumulative_pnl: number | null;
  avg_pnl: number | null;
  best_pnl: number | null;
  worst_pnl: number | null;
  profit_factor: number | null;
  avg_rr: number | null;
  avg_pips: number | null;
  total_pips: number | null;
  max_streak: number | null;
};

type PeriodKey = 'wtd' | 'mtd' | 'ytd' | 'r1m' | 'r3m' | 'r6m' | 'r1y' | 'all';

const PERIOD_BUCKET: Record<PeriodKey, 'day' | 'week' | 'month'> = {
  wtd: 'day',
  mtd: 'day',
  ytd: 'month',
  r1m: 'day',
  r3m: 'week',
  r6m: 'week',
  r1y: 'month',
  all: 'month',
};

/** ピッカーのグループ構成（現在 / 直近 / 全期間）。 */
const PERIOD_GROUPS: { headerKey: string | null; keys: PeriodKey[] }[] = [
  { headerKey: 'profile.periodGroupCurrent', keys: ['wtd', 'mtd', 'ytd'] },
  { headerKey: 'profile.periodGroupRecent', keys: ['r1m', 'r3m', 'r6m', 'r1y'] },
  { headerKey: null, keys: ['all'] },
];

/** 期間の開始時刻（ISO）。current系はカレンダー基準、recent系は今からさかのぼる。 */
function sinceForPeriod(key: PeriodKey): string | null {
  const d = new Date();
  switch (key) {
    case 'wtd': {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - x.getDay()); // 日曜始まり
      return x.toISOString();
    }
    case 'mtd':
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    case 'ytd':
      return new Date(d.getFullYear(), 0, 1).toISOString();
    case 'r1m': {
      const x = new Date(d);
      x.setMonth(x.getMonth() - 1);
      return x.toISOString();
    }
    case 'r3m': {
      const x = new Date(d);
      x.setMonth(x.getMonth() - 3);
      return x.toISOString();
    }
    case 'r6m': {
      const x = new Date(d);
      x.setMonth(x.getMonth() - 6);
      return x.toISOString();
    }
    case 'r1y': {
      const x = new Date(d);
      x.setFullYear(x.getFullYear() - 1);
      return x.toISOString();
    }
    case 'all':
      return null;
  }
}

type RawPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStatsRow | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tabItems, setTabItems] = useState<Partial<Record<TabKey, FeedCardItem[]>>>(
    {},
  );
  const [userPredictions, setUserPredictions] = useState<UserPred[]>([]);
  const [recordPeriod, setRecordPeriod] = useState<PeriodKey>('mtd');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [perfSummary, setPerfSummary] = useState<PerfSummary | null>(null);
  const [series, setSeries] = useState<SeriesRow[] | null>(null);
  const [pairStats, setPairStats] = useState<PairRow[] | null>(null);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingTab, setLoadingTab] = useState<TabKey | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  const showcaseStats = useMemo(
    () => resolveShowcaseStats(profile?.showcase_stats),
    [profile?.showcase_stats],
  );

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
      if (!targetId || which === 'records') return;
      setLoadingTab(which);
      try {
        if (which === 'predictions') {
          const { data } = await supabase.rpc('get_predictions', {
            top_n: 50,
            p_user: targetId,
          });
          setUserPredictions((data ?? []) as UserPred[]);
          return;
        }
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
          setTabItems((prev) => ({ ...prev, posts: decorated }));
          return;
        }
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
        setTabItems((prev) => ({ ...prev, shares: decorated }));
      } catch (e) {
        Alert.alert(t('profile.loadFail'), e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingTab(null);
      }
    },
    [targetId, decorateItems, t],
  );

  const emptySummary = (): PerfSummary => ({
    win_rate: null,
    trade_count: 0,
    win_count: 0,
    loss_count: 0,
    cumulative_pnl: 0,
    avg_pnl: null,
    best_pnl: null,
    worst_pnl: null,
    profit_factor: null,
    avg_rr: null,
    avg_pips: null,
    total_pips: null,
    max_streak: null,
  });

  const loadRecords = useCallback(
    async (period: PeriodKey) => {
      if (!targetId) return;
      setLoadingRecords(true);
      const since = sinceForPeriod(period);
      const bucket = PERIOD_BUCKET[period];
      const nz = (v: unknown) => (v == null ? null : num(v));
      try {
        const [sumRes, serRes, pairRes] = await Promise.all([
          supabase.rpc('get_user_perf_summary', { p_user: targetId, p_since: since }),
          supabase.rpc('get_user_series', {
            p_user: targetId,
            p_since: since,
            p_bucket: bucket,
          }),
          supabase.rpc('get_user_pair_stats', { p_user: targetId, p_since: since }),
        ]);
        const sumRow = ((sumRes.data ?? []) as Record<string, unknown>[])[0] ?? null;
        setPerfSummary(
          sumRow
            ? {
                win_rate: nz(sumRow.win_rate),
                trade_count: nz(sumRow.trade_count) ?? 0,
                win_count: nz(sumRow.win_count) ?? 0,
                loss_count: nz(sumRow.loss_count) ?? 0,
                cumulative_pnl: nz(sumRow.cumulative_pnl) ?? 0,
                avg_pnl: nz(sumRow.avg_pnl),
                best_pnl: nz(sumRow.best_pnl),
                worst_pnl: nz(sumRow.worst_pnl),
                profit_factor: nz(sumRow.profit_factor),
                avg_rr: nz(sumRow.avg_rr),
                avg_pips: nz(sumRow.avg_pips),
                total_pips: nz(sumRow.total_pips),
                max_streak: nz(sumRow.max_streak),
              }
            : emptySummary(),
        );
        setSeries(
          ((serRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
            bucket: String(r.bucket),
            pnl: num(r.pnl),
            trade_count: num(r.trade_count),
          })),
        );
        setPairStats(
          ((pairRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
            currency_pair: String(r.currency_pair),
            pnl: num(r.pnl),
            trade_count: num(r.trade_count),
          })),
        );
      } catch {
        // RPC未適用などは空表示で握りつぶす
        setPerfSummary(emptySummary());
        setSeries([]);
        setPairStats([]);
      } finally {
        setRecordsLoaded(true);
        setLoadingRecords(false);
      }
    },
    [targetId],
  );

  const changeRecordPeriod = useCallback(
    (period: PeriodKey) => {
      setPickerOpen(false);
      setRecordPeriod(period);
      loadRecords(period);
    },
    [loadRecords],
  );

  const updateActive = useCallback(
    (updater: (list: FeedCardItem[]) => FeedCardItem[]) => {
      setTabItems((prev) => ({
        ...prev,
        [activeTab]: updater(prev[activeTab] ?? []),
      }));
    },
    [activeTab],
  );

  const toggleLike = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_liked;
    updateActive((list) =>
      list.map((p) =>
        p.id === item.id
          ? {
              ...p,
              is_liked: !was,
              likes_count: Math.max(0, p.likes_count + (was ? -1 : 1)),
            }
          : p,
      ),
    );
    try {
      if (was) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
      } else {
        await supabase.from('likes').insert({ user_id: myId, post_id: item.id });
      }
    } catch (e) {
      updateActive((list) =>
        list.map((p) =>
          p.id === item.id
            ? {
                ...p,
                is_liked: was,
                likes_count: Math.max(0, p.likes_count + (was ? 1 : -1)),
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
    updateActive((list) =>
      list.map((p) => (p.id === item.id ? { ...p, is_bookmarked: !was } : p)),
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
      updateActive((list) =>
        list.map((p) => (p.id === item.id ? { ...p, is_bookmarked: was } : p)),
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
    updateActive((list) =>
      list.map((p) => (p.id === item.id ? { ...p, is_reposted: !was } : p)),
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
      updateActive((list) =>
        list.map((p) => (p.id === item.id ? { ...p, is_reposted: was } : p)),
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
      const [profileRes, followerRes, followingRes, statsRes, isFollowingRes] =
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
          supabase.rpc('get_user_stats', { p_user: targetId }).maybeSingle(),
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
      setUserStats((statsRes.data ?? null) as UserStatsRow | null);
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setIsFollowing(!!isFollowingRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [targetId, myId, isMyself, t]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadTab('posts');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const onIndexChange = useCallback(
    (index: number) => {
      const key = TAB_ORDER[index];
      if (!key) return;
      setActiveTab(key);
      if (key === 'records') {
        if (!recordsLoaded) loadRecords(recordPeriod);
      } else if (key === 'predictions') {
        if (userPredictions.length === 0) loadTab(key);
      } else if (!tabItems[key]) {
        loadTab(key);
      }
    },
    [loadTab, loadRecords, tabItems, userPredictions.length, recordsLoaded, recordPeriod],
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
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  };

  const topBar = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {profile ? `@${profile.username?.trim() || ''}` : ''}
      </Text>
      {!isMyself ? (
        <Pressable onPress={handleMenuOpen} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color={c.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {topBar}
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile || error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {topBar}
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? t('user.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fallbackName = profile.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    profile.display_name?.trim() || profile.username?.trim() || fallbackName;
  const username = profile.username?.trim() || fallbackName;
  const flag = profile.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile.nationality ?? null);
  const styleText = profile.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const renderHeader = () => (
    <View style={styles.profileSection}>
      <View style={styles.coverWrap}>
        {profile.banner_url ? (
          <>
            <Image source={{ uri: profile.banner_url }} style={styles.cover} contentFit="cover" />
            <View style={styles.coverScrim} pointerEvents="none" />
          </>
        ) : (
          <View style={[styles.cover, styles.coverEmpty]} />
        )}
        <View style={styles.avatarCentered}>
          <View style={styles.avatarRing}>
            <Avatar uri={profile.avatar_url} displayName={displayName} size={84} profile={profile} />
          </View>
        </View>
      </View>

      <View style={styles.profileBody}>
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
              <Text style={styles.metaText}>{country?.name ?? profile.nationality ?? ''}</Text>
            </View>
          )}
          {profile.trade_style && (
            <View style={styles.metaItem}>
              <Ionicons name="stats-chart-outline" size={14} color={c.textSecondary} />
              <Text style={styles.metaText}>{styleText}</Text>
            </View>
          )}
        </View>

        <View style={styles.followRow}>
          <Pressable
            style={({ pressed }) => [styles.followItem, pressed && styles.pressed]}
            onPress={() => router.push(`/follow-list?userId=${targetId}&tab=following`)}
          >
            <Text style={styles.followCount}>{followingCount}</Text>
            <Text style={styles.followLabel}>{t('profile.following')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.followItem, pressed && styles.pressed]}
            onPress={() => router.push(`/follow-list?userId=${targetId}&tab=followers`)}
          >
            <Text style={styles.followCount}>{followerCount}</Text>
            <Text style={styles.followLabel}>{t('profile.followers')}</Text>
          </Pressable>
        </View>

        <View style={styles.perfCard}>
          {showcaseStats.map((key, i) => {
            const sv = formatUserStat(key, userStats, profile.currency);
            const toneColor =
              sv.tone === 'pos' ? c.win : sv.tone === 'neg' ? c.loss : c.textPrimary;
            return (
              <View key={key} style={[styles.perfItem, i > 0 && styles.perfItemBorder]}>
                <Text
                  style={[styles.perfValue, { color: toneColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {sv.value}
                </Text>
                <Text style={styles.perfLabel}>{t(STAT_LABEL_KEY[key])}</Text>
              </View>
            );
          })}
        </View>

        {profile.bio && profile.bio.trim() !== '' && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        <ProfileLinks website={profile.website} youtube={profile.youtube} />

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
                <ActivityIndicator color={isFollowing ? c.textPrimary : '#fff'} />
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
    </View>
  );

  const renderTabBar = (props: { onTabPress: (name: string) => void }) => (
    <View style={styles.tabBar}>
      {TAB_ORDER.map((key) => {
        const active = activeTab === key;
        return (
          <Pressable
            key={key}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={() => props.onTabPress(key)}
            hitSlop={4}
          >
            <Ionicons name={TAB_ICON[key]} size={22} color={active ? c.accent : c.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );

  const emptyTitle = (key: TabKey) =>
    key === 'posts'
      ? t('profile.emptyPosts')
      : key === 'predictions'
        ? t('predictions.empty')
        : t('profile.emptyShares');

  const renderEmpty = (key: TabKey) => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{emptyTitle(key)}</Text>
    </View>
  );

  const renderFeedItem = ({ item }: { item: FeedCardItem }) => (
    <FeedCard
      item={item}
      onToggleLike={toggleLike}
      onToggleBookmark={toggleBookmark}
      onToggleRepost={toggleRepost}
      onDeleted={(postId) => updateActive((list) => list.filter((p) => p.id !== postId))}
    />
  );

  const renderPrediction = ({ item: p }: { item: UserPred }) => (
    <Pressable
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
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {topBar}

      {targetId && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType="user"
          targetId={targetId}
        />
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>{t('profile.periodPickerTitle')}</Text>
            {PERIOD_GROUPS.map((g) => (
              <View key={g.headerKey ?? 'all'}>
                {g.headerKey && (
                  <Text style={styles.pickerGroupLabel}>{t(g.headerKey)}</Text>
                )}
                {g.keys.map((k) => {
                  const active = recordPeriod === k;
                  return (
                    <Pressable
                      key={k}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        active && styles.pickerItemActive,
                        pressed && styles.pickerItemPressed,
                      ]}
                      onPress={() => changeRecordPeriod(k)}
                    >
                      <Text
                        style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                      >
                        {t(`profile.period_${k}`)}
                      </Text>
                      {active && (
                        <Ionicons name="checkmark" size={18} color={c.accent} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Tabs.Container
        renderHeader={renderHeader}
        renderTabBar={renderTabBar}
        onIndexChange={onIndexChange}
        lazy
        containerStyle={{ backgroundColor: c.background }}
        headerContainerStyle={{
          backgroundColor: c.background,
          shadowOpacity: 0,
          elevation: 0,
        }}
      >
        <Tabs.Tab name="posts">
          <Tabs.FlatList
            data={tabItems.posts ?? []}
            keyExtractor={(it) => it.id}
            renderItem={renderFeedItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={loadingTab === 'posts' ? null : renderEmpty('posts')}
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
        <Tabs.Tab name="records">
          <Tabs.ScrollView
            contentContainerStyle={styles.dashContent}
            showsVerticalScrollIndicator={false}
          >
            <UserPerformance
              summary={perfSummary}
              series={series ?? []}
              pairs={pairStats ?? []}
              currency={profile.currency}
              bucket={PERIOD_BUCKET[recordPeriod]}
              period={recordPeriod}
              onOpenPicker={() => setPickerOpen(true)}
              loading={loadingRecords}
            />
          </Tabs.ScrollView>
        </Tabs.Tab>
        <Tabs.Tab name="predictions">
          <Tabs.FlatList
            data={userPredictions}
            keyExtractor={(it) => it.id}
            renderItem={renderPrediction}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              loadingTab === 'predictions' ? null : renderEmpty('predictions')
            }
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
        <Tabs.Tab name="shares">
          <Tabs.FlatList
            data={tabItems.shares ?? []}
            keyExtractor={(it) => it.id}
            renderItem={renderFeedItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={loadingTab === 'shares' ? null : renderEmpty('shares')}
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
      </Tabs.Container>
    </SafeAreaView>
  );
}

// ===== 記録タブ: 成績ダッシュボード（グラフ主体） =====

function compactPnl(n: number): string {
  const abs = Math.abs(n);
  let str: string;
  if (abs >= 1_000_000) str = `${(n / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1000) str = `${(n / 1000).toFixed(1)}k`;
  else str = String(Math.round(n));
  return n > 0 ? `+${str}` : str;
}

function UserPerformance({
  summary,
  series,
  pairs,
  currency,
  bucket,
  period,
  onOpenPicker,
  loading,
}: {
  summary: PerfSummary | null;
  series: SeriesRow[];
  pairs: PairRow[];
  currency: string | null | undefined;
  bucket: 'day' | 'week' | 'month';
  period: PeriodKey;
  onOpenPicker: () => void;
  loading: boolean;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);

  const cumulative = num(summary?.cumulative_pnl);
  const cumColor = cumulative > 0 ? c.win : cumulative < 0 ? c.loss : c.textPrimary;
  const winRate = summary?.win_rate ?? null;
  const wins = num(summary?.win_count);
  const losses = num(summary?.loss_count);
  const ringColor = winRate == null ? c.textSecondary : winRate >= 50 ? c.win : c.loss;

  const curve = useMemo(() => {
    let acc = 0;
    return series.map((m) => {
      acc += m.pnl;
      return acc;
    });
  }, [series]);

  const hasData = !!summary && num(summary.trade_count) > 0;

  const moneyTone = (v: number | null | undefined) =>
    v == null || v === 0 ? undefined : v > 0 ? c.win : c.loss;

  type Kpi = {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
    color?: string;
  };
  const kpis: Kpi[] = summary
    ? [
        {
          icon: 'swap-horizontal',
          label: t('analytics.tradeCount'),
          value: String(num(summary.trade_count)),
        },
        {
          icon: 'calculator-outline',
          label: t('analytics.avgPnl'),
          value: summary.avg_pnl == null ? '—' : formatPnlCompact(summary.avg_pnl, currency),
          color: moneyTone(summary.avg_pnl),
        },
        {
          icon: 'flame-outline',
          label: t('profile.stat_max_streak'),
          value: String(num(summary.max_streak)),
          color: num(summary.max_streak) > 0 ? c.win : undefined,
        },
        {
          icon: 'trending-up-outline',
          label: t('stats.profit_factor'),
          value: summary.profit_factor == null ? '—' : summary.profit_factor.toFixed(2),
        },
        {
          icon: 'git-compare-outline',
          label: t('analytics.rrRatio'),
          value: summary.avg_rr == null ? '—' : summary.avg_rr.toFixed(1),
        },
        {
          icon: 'pulse-outline',
          label: t('analytics.avgPips'),
          value: summary.avg_pips == null ? '—' : formatPips(summary.avg_pips),
          color: moneyTone(summary.avg_pips),
        },
        {
          icon: 'stats-chart-outline',
          label: t('profile.totalPips'),
          value: summary.total_pips == null ? '—' : formatPips(summary.total_pips),
          color: moneyTone(summary.total_pips),
        },
        {
          icon: 'arrow-up-outline',
          label: t('stats.max_win'),
          value: summary.best_pnl == null ? '—' : formatPnlCompact(summary.best_pnl, currency),
          color: moneyTone(summary.best_pnl),
        },
        {
          icon: 'arrow-down-outline',
          label: t('stats.max_loss'),
          value: summary.worst_pnl == null ? '—' : formatPnlCompact(summary.worst_pnl, currency),
          color: moneyTone(summary.worst_pnl),
        },
      ]
    : [];

  return (
    <View style={{ gap: 14 }}>
      {/* 期間ドロップダウン（右上） */}
      <View style={styles.dashTopRow}>
        <Pressable
          style={({ pressed }) => [styles.periodBtn, pressed && styles.pressed]}
          onPress={onOpenPicker}
          hitSlop={6}
        >
          <Ionicons name="calendar-outline" size={14} color={c.textPrimary} />
          <Text style={styles.periodBtnText}>{t(`profile.period_${period}`)}</Text>
          <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
        </Pressable>
      </View>

      {loading && !summary ? (
        <View style={styles.tabCenter}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : !hasData ? (
        <View style={styles.emptyBox}>
          <Ionicons name="bar-chart-outline" size={34} color={c.textSecondary} />
          <Text style={[styles.emptyText, { marginTop: 10 }]}>
            {t('profile.perfEmptyPeriod')}
          </Text>
        </View>
      ) : (
        <>
          {/* ヒーロー: 勝率リング + 累計損益 */}
          <View style={styles.heroCard}>
            <View style={styles.ringWrap}>
              <WinRateRing rate={winRate} color={ringColor} size={112} />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text style={[styles.ringPct, { color: ringColor }]}>
                  {winRate == null ? '—' : `${Math.round(winRate)}%`}
                </Text>
                <Text style={styles.ringLabel}>{t('analytics.winRate')}</Text>
              </View>
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.heroLabel}>{t('profile.stat_cumulative_pnl')}</Text>
              <Text
                style={[styles.heroValue, { color: cumColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatPnlWithCurrency(cumulative, currency)}
              </Text>
              <View style={styles.heroWlRow}>
                <View style={styles.heroWlItem}>
                  <View style={[styles.heroDot, { backgroundColor: c.win }]} />
                  <Text style={styles.heroWlText}>
                    {wins} {t('profile.perfWins')}
                  </Text>
                </View>
                <View style={styles.heroWlItem}>
                  <View style={[styles.heroDot, { backgroundColor: c.loss }]} />
                  <Text style={styles.heroWlText}>
                    {losses} {t('profile.perfLosses')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* KPIグリッド */}
          <View style={styles.kpiGrid}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.kpiCell}>
                <Ionicons name={k.icon} size={15} color={c.textSecondary} />
                <Text style={[styles.kpiCellValue, k.color ? { color: k.color } : null]}>
                  {k.value}
                </Text>
                <Text style={styles.kpiCellLabel} numberOfLines={1}>
                  {k.label}
                </Text>
              </View>
            ))}
          </View>

          {/* 資産曲線 */}
          {curve.length >= 2 && (
            <View style={styles.dashCard}>
              <Text style={styles.dashCardTitle}>{t('analytics.equityCurve')}</Text>
              <EquityCurve
                points={curve}
                color={cumulative >= 0 ? c.win : c.loss}
                width={SCREEN_WIDTH - 24 - 32}
                height={130}
              />
            </View>
          )}

          {/* 損益の推移 */}
          {series.length >= 1 && (
            <View style={styles.dashCard}>
              <Text style={styles.dashCardTitle}>{t('profile.monthlyPnl')}</Text>
              <SeriesBars data={series} bucket={bucket} currency={currency} />
            </View>
          )}

          {/* 通貨ペア別 */}
          {pairs.length > 0 && (
            <View style={styles.dashCard}>
              <Text style={styles.dashCardTitle}>{t('analytics.pairBreakdown')}</Text>
              <PairBreakdown data={pairs} currency={currency} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function WinRateRing({
  rate,
  color,
  size,
}: {
  rate: number | null;
  color: string;
  size: number;
}) {
  const c = useThemeColors();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = rate == null ? 0 : Math.max(0, Math.min(100, rate));
  const dash = (circ * pct) / 100;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </SvgGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceAlt} strokeWidth={stroke} fill="none" />
      {pct > 0 && (
        <>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            opacity={0.18}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth={stroke - 3}
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </>
      )}
    </Svg>
  );
}

/** Catmull-Rom スプラインで滑らかな曲線パスを生成（高級感のある曲線）。 */
function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return '';
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
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
  const pad = 8;
  const innerH = height - pad * 2;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => pad + innerH - ((v - min) / range) * innerH;
  const coords = points.map((v, i) => ({ x: i * stepX, y: toY(v) }));
  const line = smoothPath(coords);
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;
  const zeroY = toY(0);
  const end = coords[coords.length - 1];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="userEquityFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.32} />
          <Stop offset="0.7" stopColor={color} stopOpacity={0.05} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
        <SvgGradient id="userEquityStroke" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </SvgGradient>
      </Defs>
      {min < 0 && max > 0 ? (
        <SvgLine
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="rgba(127,127,127,0.35)"
          strokeWidth={1}
          strokeDasharray="2 5"
        />
      ) : null}
      <Path d={area} fill="url(#userEquityFill)" />
      <Path
        d={line}
        stroke="url(#userEquityStroke)"
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 末端の発光ドット */}
      <Circle cx={end.x} cy={end.y} r={8} fill={color} opacity={0.16} />
      <Circle cx={end.x} cy={end.y} r={4.5} fill={color} />
      <Circle cx={end.x} cy={end.y} r={2} fill="#fff" opacity={0.9} />
    </Svg>
  );
}

function SeriesBars({
  data,
  bucket,
  currency,
}: {
  data: SeriesRow[];
  bucket: 'day' | 'week' | 'month';
  currency: string | null | undefined;
}) {
  const c = useThemeColors();
  const [sel, setSel] = useState<number | null>(null);
  const values = data.map((m) => m.pnl);
  const maxV = Math.max(0, ...values);
  const minV = Math.min(0, ...values);
  const range = maxV - minV || 1;
  const W = SCREEN_WIDTH - 24 - 32; // dashContent(12*2) + card(16*2)
  const H = 130;
  const zeroY = (maxV / range) * H;
  const pxPerUnit = H / range;
  const n = data.length;
  const slot = W / n;
  const gap = n > 24 ? 1.5 : n > 12 ? 3 : 5;
  const barW = Math.max(2, slot - gap);

  const label = (iso: string) => {
    const d = new Date(iso);
    return bucket === 'month' ? `${d.getMonth() + 1}` : `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const fullLabel = (iso: string) => {
    const d = new Date(iso);
    return bucket === 'month'
      ? `${d.getFullYear()}/${d.getMonth() + 1}`
      : `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  const selRow = sel !== null ? data[sel] : null;
  const total = values.reduce((s, v) => s + v, 0);

  // 上部に丸みを付けた縦バーのパス
  const barPath = (x: number, top: number, w: number, h: number, up: boolean) => {
    const r = Math.min(w / 2, 3.5);
    if (h <= 0.5) return '';
    if (up) {
      const b = top + h;
      return `M${x},${b} L${x},${(top + r).toFixed(1)} Q${x},${top} ${(x + r).toFixed(1)},${top} L${(x + w - r).toFixed(1)},${top} Q${(x + w).toFixed(1)},${top} ${(x + w).toFixed(1)},${(top + r).toFixed(1)} L${(x + w).toFixed(1)},${b} Z`;
    }
    const b = top + h;
    return `M${x},${top} L${x},${(b - r).toFixed(1)} Q${x},${b} ${(x + r).toFixed(1)},${b} L${(x + w - r).toFixed(1)},${b} Q${(x + w).toFixed(1)},${b} ${(x + w).toFixed(1)},${(b - r).toFixed(1)} L${(x + w).toFixed(1)},${top} Z`;
  };

  return (
    <View>
      <View style={{ minHeight: 24, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {selRow ? (
          <>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.surfaceAlt }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>
                {fullLabel(selRow.bucket)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: selRow.pnl >= 0 ? c.win : c.loss,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatPnlWithCurrency(selRow.pnl, currency)}
            </Text>
          </>
        ) : (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: total >= 0 ? c.win : c.loss,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatPnlWithCurrency(total, currency)}
          </Text>
        )}
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="barWin" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.win} stopOpacity={1} />
            <Stop offset="1" stopColor={c.win} stopOpacity={0.55} />
          </SvgGradient>
          <SvgGradient id="barLoss" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.loss} stopOpacity={0.55} />
            <Stop offset="1" stopColor={c.loss} stopOpacity={1} />
          </SvgGradient>
        </Defs>
        <SvgLine x1={0} y1={zeroY} x2={W} y2={zeroY} stroke={c.border} strokeWidth={1} />
        {values.map((v, i) => {
          const barH = v === 0 ? 0 : Math.max(2, Math.abs(v) * pxPerUnit);
          const up = v >= 0;
          const x = i * slot + (slot - barW) / 2;
          const top = up ? zeroY - barH : zeroY;
          const active = sel === i;
          const dim = sel !== null && !active;
          return (
            <Path
              key={i}
              d={barPath(x, top, barW, barH, up)}
              fill={up ? 'url(#barWin)' : 'url(#barLoss)'}
              opacity={dim ? 0.3 : 1}
              onPress={() => setSel(active ? null : i)}
            />
          );
        })}
        {/* タップしやすいよう透明なヒット領域 */}
        {data.map((_, i) => (
          <Rect
            key={`hit-${i}`}
            x={i * slot}
            y={0}
            width={slot}
            height={H}
            fill="transparent"
            onPress={() => setSel(sel === i ? null : i)}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((m, i) => (
          <View key={i} style={{ width: slot, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: c.textSecondary }}>
              {i % labelEvery === 0 ? label(m.bucket) : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PairBreakdown({
  data,
  currency,
}: {
  data: PairRow[];
  currency: string | null | undefined;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const maxAbs = Math.max(1, ...data.map((r) => Math.abs(r.pnl)));
  const totalTrades = data.reduce((s, r) => s + r.trade_count, 0) || 1;
  return (
    <View style={{ gap: 14 }}>
      {data.map((r, i) => {
        const positive = r.pnl >= 0;
        const color = positive ? c.win : c.loss;
        const share = Math.round((r.trade_count / totalTrades) * 100);
        return (
          <View key={r.currency_pair} style={{ gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.pairRank}>
                <Text style={styles.pairRankText}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.2 }}>
                {r.currency_pair}
              </Text>
              <Text style={{ fontSize: 11, color: c.textSecondary }}>
                {r.trade_count}・{share}%
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>
                {compactPnl(r.pnl)}
              </Text>
            </View>
            <View style={styles.pairTrack}>
              <View
                style={{
                  height: '100%',
                  width: `${Math.max(4, (Math.abs(r.pnl) / maxAbs) * 100)}%`,
                  borderRadius: 5,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
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
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: { width: 56 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: c.textSecondary, fontSize: 14 },
    profileSection: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
    coverWrap: { position: 'relative' },
    cover: { width: '100%', height: 180, borderRadius: 14, backgroundColor: c.surfaceAlt },
    coverEmpty: { backgroundColor: c.surfaceAlt },
    coverScrim: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    avatarCentered: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: -18,
      alignItems: 'center',
      zIndex: 2,
    },
    avatarRing: {
      borderRadius: 999,
      borderWidth: 3,
      borderColor: c.background,
      backgroundColor: c.background,
    },
    profileBody: { paddingTop: 30, alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    displayName: { fontSize: 19, fontWeight: '700', color: c.textPrimary },
    verifiedBadge: {
      width: 20,
      height: 20,
      borderRadius: 8,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    username: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
      justifyContent: 'center',
    },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    flag: { fontSize: 18 },
    metaText: { fontSize: 13, color: c.textSecondary },
    followRow: { flexDirection: 'row', gap: 24, marginTop: 12, justifyContent: 'center' },
    followItem: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    followCount: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    followLabel: { fontSize: 13, color: c.textSecondary },
    pressed: { opacity: 0.5 },
    perfCard: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 14,
    },
    perfItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
    perfItemBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.border },
    perfValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
    perfLabel: { fontSize: 11, color: c.textSecondary, marginTop: 4 },
    bio: {
      fontSize: 14,
      color: c.textPrimary,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 20,
    },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
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
    followButtonActive: { backgroundColor: c.surfaceAlt, borderColor: c.border },
    followButtonPressed: { opacity: 0.85 },
    followButtonDisabled: { opacity: 0.6 },
    followButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    followButtonTextActive: { color: c.textPrimary },
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
    messageButtonPressed: { opacity: 0.7 },
    messageButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      height: 52,
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
    tabButtonActive: { borderBottomColor: c.accent },
    listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 40, gap: 10 },
    dashContent: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 48 },
    tabCenter: { paddingVertical: 40, alignItems: 'center' },
    emptyBox: { paddingVertical: 60, alignItems: 'center' },
    emptyText: { fontSize: 14, color: c.textSecondary },
    dashTopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    periodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    periodBtnText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      gap: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    ringWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    ringPct: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
    ringLabel: { fontSize: 10, color: c.textSecondary, marginTop: 1 },
    heroRight: { flex: 1, gap: 4 },
    heroLabel: { fontSize: 12, color: c.textSecondary },
    heroValue: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
    heroWlRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
    heroWlItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heroDot: { width: 8, height: 8, borderRadius: 4 },
    heroWlText: { fontSize: 12, color: c.textSecondary, fontVariant: ['tabular-nums'] },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    kpiCell: { width: '33.333%', alignItems: 'center', paddingVertical: 12, gap: 5 },
    kpiCellLabel: { fontSize: 10, color: c.textSecondary },
    kpiCellValue: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingTop: 110,
      paddingHorizontal: 16,
    },
    pickerCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 8,
      minWidth: 200,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    pickerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      paddingHorizontal: 10,
      paddingTop: 6,
      paddingBottom: 8,
    },
    pickerGroupLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 2,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 11,
      borderRadius: 10,
    },
    pickerItemActive: { backgroundColor: c.surfaceAlt },
    pickerItemPressed: { opacity: 0.6 },
    pickerItemText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    pickerItemTextActive: { color: c.accent },
    dashCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    pairRank: {
      width: 18,
      height: 18,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pairRankText: { fontSize: 10, fontWeight: '800', color: c.textSecondary },
    pairTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
    },
    dashCardTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 14,
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
  });
}
