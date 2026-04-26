import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Post, Profile, Trade, tradeStyleLabel } from '@/lib/types';

type FeedItem = Post & {
  trade: Trade | null;
  profile: Profile | null;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_reposted: boolean;
  liked_by?: Profile | null; // フォロー中のユーザーがいいねした投稿の場合、その人
};

type FeedTab = 'all' | 'following';

export default function FeedScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FeedTab>('all');

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

  const profileSelect = `
    id, email, username, display_name, avatar_url, bio,
    trade_style, language, is_premium, nationality, is_verified, created_at
  `;

  const loadAllFeed = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(
        `*,
        trade:trades!posts_trade_id_fkey (*),
        profile:profiles!posts_user_id_fkey (${profileSelect})`,
      )
      .eq('post_type', 'trade_result')
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) throw new Error(fetchError.message);
    return (data ?? []) as (Post & {
      trade: Trade | null;
      profile: Profile | null;
    })[];
  }, [profileSelect]);

  const loadFollowingFeed = useCallback(async () => {
    if (!myId) return [];

    // 自分がフォロー中のユーザーID
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', myId);
    const followingIds = (follows ?? []).map(
      (f: { following_id: string }) => f.following_id,
    );
    if (followingIds.length === 0) return [];

    // (a) フォロー中ユーザーの投稿
    const { data: ownPosts, error: ownError } = await supabase
      .from('posts')
      .select(
        `*,
        trade:trades!posts_trade_id_fkey (*),
        profile:profiles!posts_user_id_fkey (${profileSelect})`,
      )
      .eq('post_type', 'trade_result')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30);
    if (ownError) throw new Error(ownError.message);

    // (b) フォロー中ユーザーがいいねした投稿
    const { data: likedRows, error: likeError } = await supabase
      .from('likes')
      .select(
        `post_id, user_id, created_at,
        liker:profiles!likes_user_id_fkey (${profileSelect}),
        post:posts!likes_post_id_fkey (
          *,
          trade:trades!posts_trade_id_fkey (*),
          profile:profiles!posts_user_id_fkey (${profileSelect})
        )`,
      )
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30);
    if (likeError) throw new Error(likeError.message);

    type RawLike = {
      post_id: string;
      user_id: string;
      created_at: string;
      liker: Profile | null;
      post: (Post & { trade: Trade | null; profile: Profile | null }) | null;
    };

    const likedItems = ((likedRows as unknown) as RawLike[] | null ?? [])
      .filter((l) => l.post && l.post.user_id !== myId)
      .map((l) => ({
        ...(l.post as Post & {
          trade: Trade | null;
          profile: Profile | null;
        }),
        liked_by: l.liker,
      }));

    // 2リストをマージし重複除去（投稿自体が優先）
    const ownIds = new Set(
      (ownPosts ?? []).map((p: { id: string }) => p.id),
    );
    const merged = [
      ...(ownPosts ?? []),
      ...likedItems.filter((i) => !ownIds.has(i.id)),
    ] as (Post & {
      trade: Trade | null;
      profile: Profile | null;
      liked_by?: Profile | null;
    })[];

    merged.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return merged.slice(0, 50);
  }, [myId, profileSelect]);

  const loadFeed = useCallback(async () => {
    setError(null);
    try {
      const posts =
        tab === 'all' ? await loadAllFeed() : await loadFollowingFeed();

      const postIds = posts.map((p) => p.id);
      let likedSet = new Set<string>();
      let bookmarkedSet = new Set<string>();
      let repostedSet = new Set<string>();
      if (myId && postIds.length > 0) {
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
        likedSet = new Set(
          (likesRes.data ?? []).map((l: { post_id: string }) => l.post_id),
        );
        bookmarkedSet = new Set(
          (bmRes.data ?? []).map((l: { post_id: string }) => l.post_id),
        );
        repostedSet = new Set(
          (rpRes.data ?? []).map((l: { post_id: string }) => l.post_id),
        );
      }

      const merged = posts.map((p) => ({
        ...p,
        is_liked: likedSet.has(p.id),
        is_bookmarked: bookmarkedSet.has(p.id),
        is_reposted: repostedSet.has(p.id),
      })) as FeedItem[];
      setItems(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }, [tab, myId, loadAllFeed, loadFollowingFeed]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await Promise.all([loadFeed(), loadUnread()]);
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [loadFeed, loadUnread]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const toggleBookmark = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert('ログインが必要です');
      return;
    }
    const was = item.is_bookmarked;
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_bookmarked: !was } : p,
      ),
    );
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
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, is_bookmarked: was } : p,
        ),
      );
      Alert.alert(
        'エラー',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const toggleRepost = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert('ログインが必要です');
      return;
    }
    const was = item.is_reposted;
    if (!was) {
      // confirm before reposting
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'リポストしますか？',
          'フォロワーのフィードに表示されます。',
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
            { text: 'リポスト', onPress: () => resolve(true) },
          ],
        );
      });
      if (!ok) return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_reposted: !was } : p,
      ),
    );
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
          .insert({ user_id: myId, post_id: item.id });
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, is_reposted: was } : p,
        ),
      );
      Alert.alert(
        'エラー',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const toggleLike = async (item: FeedItem) => {
    if (!myId) {
      Alert.alert('ログインが必要です');
      return;
    }
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
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
        if (deleteError) throw new Error(deleteError.message);
      } else {
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ user_id: myId, post_id: item.id });
        if (insertError) throw new Error(insertError.message);
      }
    } catch (e) {
      // revert
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
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('いいね失敗', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>フィード</Text>
          </View>
          <View style={styles.headerActions}>
            <Link href="/search" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Ionicons name="search-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/ranking" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Ionicons name="trophy-outline" size={20} color={c.textPrimary} />
              </Pressable>
            </Link>
            <Link href="/messages" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={20}
                  color={c.textPrimary}
                />
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={c.textPrimary}
                />
                {unreadCount > 0 && <View style={styles.unreadBadge} />}
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === 'all' && styles.tabActive]}
            onPress={() => setTab('all')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'all' && styles.tabTextActive,
              ]}
            >
              全体
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'following' && styles.tabActive]}
            onPress={() => setTab('following')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'following' && styles.tabTextActive,
              ]}
            >
              フォロー中
            </Text>
          </Pressable>
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
              <Text style={styles.emptyTitle}>
                {tab === 'all'
                  ? 'まだ投稿がありません'
                  : 'フォロー中の投稿はまだありません'}
              </Text>
              <Text style={styles.emptyText}>
                {tab === 'all'
                  ? '記録タブで「フィードに共有」をオンにして\n取引を保存すると、ここに表示されます。'
                  : '気になるトレーダーをフォローすると\nその人の投稿といいねがここに流れます。'}
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
                onToggleRepost={toggleRepost}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FeedCard({
  item,
  onToggleLike,
  onToggleBookmark,
  onToggleRepost,
}: {
  item: FeedItem;
  onToggleLike: (item: FeedItem) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onToggleRepost: (item: FeedItem) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const profile = item.profile;
  const trade = item.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile?.nationality ?? null);
  const styleText = profile?.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const directionLabel = trade
    ? trade.direction === 'long'
      ? 'ロング'
      : 'ショート'
    : '';
  const resultLabel = trade
    ? trade.result === 'win'
      ? '利確'
      : trade.result === 'loss'
        ? '損切り'
        : null
    : null;
  const date = new Date(trade?.traded_at ?? item.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const userId = profile?.id ?? item.user_id;

  return (
    <View style={styles.card}>
      {item.liked_by && (
        <View style={styles.likedByRow}>
          <Ionicons name="heart" size={12} color={c.loss} />
          <Text style={styles.likedByText}>
            {item.liked_by.display_name?.trim() ||
              item.liked_by.username?.trim() ||
              'ユーザー'}{' '}
            さんがいいねしました
          </Text>
        </View>
      )}
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

      {trade && (
        <View style={styles.tradeBlock}>
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
        </View>
      )}

      {item.content && item.content.trim() !== '' && (
        <Text style={styles.memo}>{item.content}</Text>
      )}

      {item.image_urls && item.image_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesScroll}
          contentContainerStyle={styles.imagesScrollContent}
        >
          {item.image_urls.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={styles.feedImage}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      )}

      {item.hashtags && item.hashtags.length > 0 && (
        <View style={styles.tagChips}>
          {item.hashtags.slice(0, 6).map((tag) => (
            <Pressable
              key={tag}
              onPress={() => router.push(`/search?tag=${tag}`)}
              style={styles.tagChip}
            >
              <Text style={styles.tagChipText}>#{tag}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onToggleLike(item)}
          hitSlop={6}
        >
          <Ionicons
            name={item.is_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.is_liked ? c.loss : c.textSecondary}
          />
          <Text style={styles.actionCount}>{item.likes_count}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => router.push(`/comments?postId=${item.id}`)}
          hitSlop={6}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={c.textSecondary}
          />
          <Text style={styles.actionCount}>{item.comments_count}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onToggleRepost(item)}
          hitSlop={6}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={item.is_reposted ? c.win : c.textSecondary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onToggleBookmark(item)}
          hitSlop={6}
        >
          <Ionicons
            name={item.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={item.is_bookmarked ? c.accent : c.textSecondary}
          />
        </Pressable>

        <Text style={styles.date}>{dateStr}</Text>
      </View>
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
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
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
    tabActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
    },
    tabTextActive: {
      color: '#fff',
    },
    likedByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    likedByText: {
      fontSize: 11,
      color: c.textSecondary,
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
    imagesScroll: {
      marginTop: 10,
    },
    imagesScrollContent: {
      gap: 8,
    },
    feedImage: {
      width: 200,
      height: 200,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    tagChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
    },
    tagChipText: {
      fontSize: 11,
      color: c.accent,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionButtonPressed: {
      opacity: 0.6,
    },
    actionIcon: {
      fontSize: 18,
      color: c.textSecondary,
    },
    actionCount: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
      minWidth: 18,
    },
    date: {
      fontSize: 11,
      color: c.textSecondary,
      marginLeft: 'auto',
    },
  });
}
