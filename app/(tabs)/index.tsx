import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmailVerifyBanner } from '@/components/email-verify-banner';
import { EmptyState } from '@/components/empty-state';
import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { FeedSkeletonList } from '@/components/skeleton';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBlocks } from '@/hooks/use-blocks';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Post, PROFILE_COLUMNS, Profile, Trade } from '@/lib/types';

type FeedItem = FeedCardItem;
type RawPost = Post & { trade: Trade | null; profile: Profile | null };

// タブの並び順 = 表示順。全体を左、フォロー中を右にする。
type FeedTab = 'all' | 'following';
const TAB_ORDER: FeedTab[] = ['all', 'following'];

export default function FeedScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const { isBlocked } = useBlocks();
  // いいね処理中の post_id（連打での重複リクエスト/クラッシュ防止）
  const likeInFlight = useRef<Set<string>>(new Set());
  const myId = session?.user.id ?? null;

  // タブごとに別データを保持（全体/フォロー中）。
  const [feeds, setFeeds] = useState<Record<FeedTab, FeedItem[]>>({
    all: [],
    following: [],
  });
  const loadedRef = useRef<Record<FeedTab, boolean>>({ all: false, following: false });
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [loadingTab, setLoadingTab] = useState<FeedTab | null>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!myId) {
      setUnreadCount(0);
      return;
    }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', myId)
      .eq('is_read', false);
    setUnreadCount(count ?? 0);
  }, [myId]);

  const loadAllFeed = useCallback(async (): Promise<RawPost[]> => {
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(
        `*,
        trade:trades!posts_trade_id_fkey (*),
        profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})`,
      )
      .in('post_type', ['trade_result', 'text', 'strategy'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) throw new Error(fetchError.message);
    return (data ?? []) as RawPost[];
  }, []);

  // フォロー中ユーザーの投稿のみ。誰もフォローしていなければ空配列。
  const loadFollowingFeed = useCallback(async (): Promise<RawPost[]> => {
    if (!myId) return [];
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', myId);
    const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
    if (ids.length === 0) return [];
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(
        `*,
        trade:trades!posts_trade_id_fkey (*),
        profile:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})`,
      )
      .in('post_type', ['trade_result', 'text', 'strategy'])
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) throw new Error(fetchError.message);
    return (data ?? []) as RawPost[];
  }, [myId]);

  // いいね/ブックマーク/リポストの状態を付与する。
  const decorate = useCallback(
    async (posts: RawPost[]): Promise<FeedItem[]> => {
      let likedSet = new Set<string>();
      let bookmarkedSet = new Set<string>();
      let repostedSet = new Set<string>();
      const postIds = posts.map((p) => p.id);
      if (myId && postIds.length > 0) {
        const [likesRes, bmRes, rpRes] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', myId).in('post_id', postIds),
          supabase.from('bookmarks').select('post_id').eq('user_id', myId).in('post_id', postIds),
          supabase.from('reposts').select('post_id').eq('user_id', myId).in('post_id', postIds),
        ]);
        likedSet = new Set((likesRes.data ?? []).map((l: { post_id: string }) => l.post_id));
        bookmarkedSet = new Set((bmRes.data ?? []).map((l: { post_id: string }) => l.post_id));
        repostedSet = new Set((rpRes.data ?? []).map((l: { post_id: string }) => l.post_id));
      }
      return posts
        .filter((p) => !isBlocked(p.user_id))
        .map((p) => ({
          ...p,
          is_liked: likedSet.has(p.id),
          is_bookmarked: bookmarkedSet.has(p.id),
          is_reposted: repostedSet.has(p.id),
        }));
    },
    [myId, isBlocked],
  );

  const loadInto = useCallback(
    async (mode: FeedTab, opts?: { silent?: boolean }) => {
      setError(null);
      if (!opts?.silent) setLoadingTab(mode);
      try {
        const posts = mode === 'following' ? await loadFollowingFeed() : await loadAllFeed();
        const merged = await decorate(posts);
        setFeeds((prev) => ({ ...prev, [mode]: merged }));
        loadedRef.current[mode] = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingTab((cur) => (cur === mode ? null : cur));
      }
    },
    [loadAllFeed, loadFollowingFeed, decorate],
  );

  useFocusEffect(
    useCallback(() => {
      loadUnread();
      // フォーカス時にアクティブタブを更新（既読込みなら skeleton を出さず差し替え）
      loadInto(activeTab, { silent: loadedRef.current[activeTab] });
    }, [loadUnread, loadInto, activeTab]),
  );

  const onIndexChange = useCallback(
    (index: number) => {
      const tab = TAB_ORDER[index];
      if (!tab) return;
      setActiveTab(tab);
      if (!loadedRef.current[tab]) loadInto(tab);
    },
    [loadInto],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInto(activeTab, { silent: true }), loadUnread()]);
    setRefreshing(false);
  };

  // 全体/フォロー中の両リストに同じ更新を反映（投稿は両方に出うるため）。
  const mutateItem = useCallback((id: string, fn: (p: FeedItem) => FeedItem) => {
    setFeeds((prev) => ({
      all: prev.all.map((p) => (p.id === id ? fn(p) : p)),
      following: prev.following.map((p) => (p.id === id ? fn(p) : p)),
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setFeeds((prev) => ({
      all: prev.all.filter((p) => p.id !== id),
      following: prev.following.filter((p) => p.id !== id),
    }));
  }, []);

  const toggleBookmark = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert(t('feed.loginRequired'));
      return;
    }
    const was = item.is_bookmarked;
    mutateItem(item.id, (p) => ({ ...p, is_bookmarked: !was }));
    try {
      if (was) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: myId, post_id: item.id });
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      mutateItem(item.id, (p) => ({ ...p, is_bookmarked: was }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const toggleRepost = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert(t('feed.loginRequired'));
      return;
    }
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
    mutateItem(item.id, (p) => ({ ...p, is_reposted: !was }));
    try {
      if (was) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('reposts')
          .upsert(
            { user_id: myId, post_id: item.id },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          );
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      mutateItem(item.id, (p) => ({ ...p, is_reposted: was }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const toggleLike = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert(t('feed.loginRequired'));
      return;
    }
    // 同一投稿のいいね処理が進行中なら無視（連打クラッシュ防止）
    if (likeInFlight.current.has(item.id)) return;
    likeInFlight.current.add(item.id);
    const wasLiked = item.is_liked;
    mutateItem(item.id, (p) => ({
      ...p,
      is_liked: !wasLiked,
      likes_count: Math.max(0, p.likes_count + (wasLiked ? -1 : 1)),
    }));

    try {
      if (wasLiked) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
        if (deleteError) throw new Error(deleteError.message);
      } else {
        const { error: insertError } = await supabase
          .from('likes')
          .upsert(
            { user_id: myId, post_id: item.id },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          );
        if (insertError) throw new Error(insertError.message);
      }
    } catch (e) {
      mutateItem(item.id, (p) => ({
        ...p,
        is_liked: wasLiked,
        likes_count: Math.max(0, p.likes_count + (wasLiked ? 1 : -1)),
      }));
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('feed.likeFailed'), msg);
    } finally {
      likeInFlight.current.delete(item.id);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard
        item={item}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
        onToggleRepost={toggleRepost}
        onDeleted={removeItem}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeItem],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>
              Trade<Text style={styles.logoAccent}>Log</Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Link href="/search" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="search-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/ranking" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="trophy-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/predictions" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="pulse-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/messages" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="paper-plane-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/create-post" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="add-circle-outline" size={22} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}>
                <Ionicons name="notifications-outline" size={20} color={c.textPrimary} />
                {unreadCount > 0 && <View style={styles.unreadBadge} />}
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    ),
    [styles, c.textPrimary, unreadCount],
  );

  const renderTabBar = useCallback(
    (props: { onTabPress: (name: string) => void }) => (
      <View style={styles.feedTabs}>
        {TAB_ORDER.map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable key={tab} onPress={() => props.onTabPress(tab)} style={styles.feedTab}>
              <Text style={[styles.feedTabText, active && styles.feedTabTextActive]}>
                {tab === 'following' ? t('feed.tabFollowing') : t('feed.tabAll')}
              </Text>
              {active && <View style={styles.feedTabUnderline} />}
            </Pressable>
          );
        })}
      </View>
    ),
    [styles, activeTab, t],
  );

  const listEmpty = (tab: FeedTab) => {
    if (loadingTab === tab) return <FeedSkeletonList count={6} />;
    return tab === 'following' ? (
      <EmptyState
        icon="people-outline"
        title={t('empty.following_title')}
        subtitle={t('empty.following_subtitle')}
        actionLabel={t('empty.feed_discover')}
        onAction={() => router.push('/ranking')}
      />
    ) : (
      <EmptyState
        icon="newspaper-outline"
        title={t('empty.feed_title')}
        subtitle={t('empty.feed_subtitle')}
        actionLabel={t('empty.feed_action')}
        onAction={() => router.push('/create-post')}
        secondaryLabel={t('empty.feed_discover')}
        onSecondary={() => router.push('/ranking')}
      />
    );
  };

  const errorHeader = error ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>
        {t('feed.errorPrefix')}
        {error}
      </Text>
    </View>
  ) : null;

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <EmailVerifyBanner />
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
        <Tabs.Tab name="all">
          <Tabs.FlatList
            data={feeds.all}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.body}
            ListHeaderComponent={activeTab === 'all' ? errorHeader : null}
            ListEmptyComponent={listEmpty('all')}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            windowSize={7}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            removeClippedSubviews
          />
        </Tabs.Tab>
        <Tabs.Tab name="following">
          <Tabs.FlatList
            data={feeds.following}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.body}
            ListHeaderComponent={activeTab === 'following' ? errorHeader : null}
            ListEmptyComponent={listEmpty('following')}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            windowSize={7}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            removeClippedSubviews
          />
        </Tabs.Tab>
      </Tabs.Container>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: c.background,
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
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    unreadBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.loss,
      borderWidth: 2,
      borderColor: c.background,
    },
    headerButtonPressed: {
      opacity: 0.7,
    },
    feedTabs: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    feedTab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      position: 'relative',
    },
    feedTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    feedTabTextActive: {
      color: c.textPrimary,
      fontWeight: '800',
    },
    feedTabUnderline: {
      position: 'absolute',
      bottom: -StyleSheet.hairlineWidth,
      height: 2,
      width: 44,
      borderRadius: 1,
      backgroundColor: c.accent,
    },
    logo: {
      fontSize: 26,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.8,
    },
    logoAccent: {
      color: '#10B981',
      fontWeight: '800',
    },
    body: {
      paddingBottom: 40,
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
  });
}
