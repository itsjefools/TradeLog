import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Share,
  Text,
  View,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { ProfileLinks } from '@/components/profile-links';
import { TradeRow } from '@/components/trade-row';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { findCountry, flagEmoji } from '@/lib/countries';
import {
  computeStat,
  resolveShowcaseStats,
  STAT_LABEL_KEY,
} from '@/lib/profile-stats';
import { computeStreak } from '@/lib/streak';
import { supabase } from '@/lib/supabase';
import { Post, PROFILE_COLUMNS, Profile, Trade, tradeStyleLabel } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / 4;

type TabKey = 'posts' | 'records' | 'likes' | 'reposts';
const TAB_ORDER: TabKey[] = ['posts', 'records', 'likes', 'reposts'];
const TAB_ICON: Record<TabKey, React.ComponentProps<typeof Ionicons>['name']> = {
  posts: 'grid-outline',
  records: 'document-text-outline',
  likes: 'heart-outline',
  reposts: 'repeat',
};

type RawPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

export default function ProfileScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const { profile, refresh } = useProfile();
  const { trades } = useTrades();

  const streak = useMemo(() => computeStreak(trades), [trades]);
  const showcaseStats = useMemo(
    () => resolveShowcaseStats(profile?.showcase_stats),
    [profile?.showcase_stats],
  );

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // タブごとのデータ（投稿/いいね/リポスト）。記録は trades をそのまま使う。
  const [tabItems, setTabItems] = useState<Partial<Record<TabKey, FeedCardItem[]>>>(
    {},
  );
  const [loadingTab, setLoadingTab] = useState<TabKey | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  const myId = session?.user.id ?? null;
  const router = useRouter();

  const loadCounts = useCallback(async () => {
    if (!myId) {
      setFollowerCount(0);
      setFollowingCount(0);
      return;
    }
    const [followerRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', myId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', myId),
    ]);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
  }, [myId]);

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
        supabase.from('likes').select('post_id').eq('user_id', myId).in('post_id', postIds),
        supabase.from('bookmarks').select('post_id').eq('user_id', myId).in('post_id', postIds),
        supabase.from('reposts').select('post_id').eq('user_id', myId).in('post_id', postIds),
      ]);
      const likedSet = new Set((likesRes.data ?? []).map((l: { post_id: string }) => l.post_id));
      const bookmarkedSet = new Set((bmRes.data ?? []).map((l: { post_id: string }) => l.post_id));
      const repostedSet = new Set((rpRes.data ?? []).map((l: { post_id: string }) => l.post_id));
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
      if (!myId || which === 'records') return;
      setLoadingTab(which);
      try {
        let posts: RawPost[] = [];
        if (which === 'posts') {
          const { data } = await supabase
            .from('posts')
            .select(
              `*, trade:trades!posts_trade_id_fkey (*), profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})`,
            )
            .eq('user_id', myId)
            .in('post_type', ['trade_result', 'text', 'strategy'])
            .order('created_at', { ascending: false })
            .limit(50);
          posts = (data ?? []) as RawPost[];
        } else {
          const table = which === 'likes' ? 'likes' : 'reposts';
          const fk = which === 'likes' ? 'likes_post_id_fkey' : 'reposts_post_id_fkey';
          const { data } = await supabase
            .from(table)
            .select(
              `created_at, post:posts!${fk} (*, trade:trades!posts_trade_id_fkey (*), profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS}))`,
            )
            .eq('user_id', myId)
            .order('created_at', { ascending: false })
            .limit(50);
          type Row = { post: RawPost | null };
          posts = ((data ?? []) as unknown as Row[])
            .map((r) => r.post)
            .filter((p): p is RawPost => p !== null);
        }
        const decorated = await decorateItems(posts);
        setTabItems((prev) => ({ ...prev, [which]: decorated }));
      } catch (e) {
        Alert.alert(t('profile.loadFail'), e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingTab(null);
      }
    },
    [myId, decorateItems, t],
  );

  useFocusEffect(
    useCallback(() => {
      loadCounts();
      if (activeTab !== 'records' && !tabItems[activeTab]) loadTab(activeTab);
    }, [loadCounts, loadTab, activeTab, tabItems]),
  );

  const onIndexChange = useCallback(
    (index: number) => {
      const key = TAB_ORDER[index];
      if (!key) return;
      setActiveTab(key);
      if (key !== 'records' && !tabItems[key]) loadTab(key);
    },
    [loadTab, tabItems],
  );

  const updateActive = useCallback(
    (updater: (list: FeedCardItem[]) => FeedCardItem[]) => {
      setTabItems((prev) => ({ ...prev, [activeTab]: updater(prev[activeTab] ?? []) }));
    },
    [activeTab],
  );

  const toggleLike = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_liked;
    updateActive((list) =>
      list.map((p) =>
        p.id === item.id
          ? { ...p, is_liked: !was, likes_count: Math.max(0, p.likes_count + (was ? -1 : 1)) }
          : p,
      ),
    );
    try {
      if (was) {
        await supabase.from('likes').delete().eq('user_id', myId).eq('post_id', item.id);
      } else {
        await supabase.from('likes').insert({ user_id: myId, post_id: item.id });
      }
    } catch (e) {
      updateActive((list) =>
        list.map((p) =>
          p.id === item.id
            ? { ...p, is_liked: was, likes_count: Math.max(0, p.likes_count + (was ? 1 : -1)) }
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
        await supabase.from('bookmarks').delete().eq('user_id', myId).eq('post_id', item.id);
      } else {
        await supabase.from('bookmarks').insert({ user_id: myId, post_id: item.id });
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
        await supabase.from('reposts').delete().eq('user_id', myId).eq('post_id', item.id);
      } else {
        await supabase
          .from('reposts')
          .upsert({ user_id: myId, post_id: item.id }, { onConflict: 'user_id,post_id', ignoreDuplicates: true });
      }
    } catch (e) {
      updateActive((list) =>
        list.map((p) => (p.id === item.id ? { ...p, is_reposted: was } : p)),
      );
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const email = session?.user.email ?? '';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split('@')[0] ||
    t('profile.defaultName');
  const username = profile?.username?.trim() || email.split('@')[0] || 'user';
  const country = findCountry(profile?.nationality ?? null);
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const styleText = tradeStyleLabel(profile?.trade_style);

  const handleShareProfile = async () => {
    try {
      await Share.share({ message: `${displayName} (@${username}) · TradeLog` });
    } catch {
      /* noop */
    }
  };

  // ヘッダーを左スワイプで設定へ（X/Instagram風）
  const openSettings = useCallback(() => router.push('/settings'), [router]);
  const headerSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-16, 16])
        .onEnd((e) => {
          if (e.translationX <= -50) runOnJS(openSettings)();
        }),
    [openSettings],
  );

  const renderHeader = () => (
    <GestureDetector gesture={headerSwipe}>
    <View style={styles.profileSection}>
      <View style={styles.coverWrap}>
        {profile?.banner_url ? (
          <>
            <Image source={{ uri: profile.banner_url }} style={styles.cover} contentFit="cover" />
            <View style={styles.coverScrim} pointerEvents="none" />
          </>
        ) : (
          <View style={[styles.cover, styles.coverEmpty]} />
        )}
        <View style={styles.coverActions}>
          <Pressable
            style={({ pressed }) => [styles.coverActionBtn, pressed && styles.pressed]}
            hitSlop={8}
            onPress={handleShareProfile}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.coverActionBtn, pressed && styles.pressed]}
            hitSlop={8}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={17} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.avatarCentered}>
          <View style={styles.avatarRing}>
            <Avatar uri={profile?.avatar_url} displayName={displayName} size={84} profile={profile} />
          </View>
        </View>
      </View>

      <View style={styles.profileBody}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile?.is_verified && (
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
              <Text style={styles.metaText}>{country?.name ?? profile?.nationality ?? ''}</Text>
            </View>
          )}
          {profile?.trade_style && (
            <View style={styles.metaItem}>
              <Ionicons name="stats-chart-outline" size={14} color={c.textSecondary} />
              <Text style={styles.metaText}>{styleText}</Text>
            </View>
          )}
        </View>

        <View style={styles.followRow}>
          <Pressable
            style={({ pressed }) => [styles.followItem, pressed && styles.pressed]}
            onPress={() => myId && router.push(`/follow-list?userId=${myId}&tab=following`)}
          >
            <Text style={styles.followCount}>{followingCount}</Text>
            <Text style={styles.followLabel}>{t('profile.following')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.followItem, pressed && styles.pressed]}
            onPress={() => myId && router.push(`/follow-list?userId=${myId}&tab=followers`)}
          >
            <Text style={styles.followCount}>{followerCount}</Text>
            <Text style={styles.followLabel}>{t('profile.followers')}</Text>
          </Pressable>
        </View>

        <View style={styles.perfCard}>
          {showcaseStats.map((key, i) => {
            const sv = computeStat(key, trades, profile?.currency);
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

        {profile?.bio && profile.bio.trim() !== '' && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        <ProfileLinks website={profile?.website} youtube={profile?.youtube} />

        {streak >= 1 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{t('profile.streak', { count: streak })}</Text>
          </View>
        )}

        {!profile && (
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('profile.retry')}</Text>
          </Pressable>
        )}
      </View>
    </View>
    </GestureDetector>
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

  const emptyFor = (key: TabKey) =>
    key === 'records'
      ? t('empty.trades_title')
      : key === 'posts'
        ? t('profile.emptyPosts')
        : key === 'likes'
          ? t('profile.emptyLikes')
          : t('profile.emptyReposts');

  const renderEmpty = (key: TabKey) => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{emptyFor(key)}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Tabs.FlatList
            data={trades}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <TradeRow
                trade={item}
                showHint={false}
                onPress={() => router.push(`/trade/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.recordsContent}
            ListEmptyComponent={renderEmpty('records')}
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
        <Tabs.Tab name="likes">
          <Tabs.FlatList
            data={tabItems.likes ?? []}
            keyExtractor={(it) => it.id}
            renderItem={renderFeedItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={loadingTab === 'likes' ? null : renderEmpty('likes')}
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
        <Tabs.Tab name="reposts">
          <Tabs.FlatList
            data={tabItems.reposts ?? []}
            keyExtractor={(it) => it.id}
            renderItem={renderFeedItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={loadingTab === 'reposts' ? null : renderEmpty('reposts')}
            showsVerticalScrollIndicator={false}
          />
        </Tabs.Tab>
      </Tabs.Container>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    profileSection: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
    coverWrap: { position: 'relative' },
    cover: { width: '100%', height: 180, borderRadius: 14, backgroundColor: c.surfaceAlt },
    coverEmpty: { backgroundColor: c.surfaceAlt },
    coverScrim: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    coverActions: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      gap: 10,
      zIndex: 2,
    },
    coverActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.5 },
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
    streakChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: '#F97316',
      backgroundColor: c.surfaceAlt,
    },
    streakEmoji: { fontSize: 14 },
    streakText: { fontSize: 12, fontWeight: '700', color: '#F97316' },
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
    retryButton: { paddingVertical: 12, alignItems: 'center' },
    retryText: { color: c.accent, fontSize: 13, fontWeight: '600' },
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
    recordsContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 40, gap: 8 },
    emptyBox: { paddingVertical: 60, alignItems: 'center' },
    emptyTitle: { fontSize: 14, color: c.textSecondary },
  });
}
