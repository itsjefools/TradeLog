import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / 3;
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { computeBadges, tierColor } from '@/lib/badges';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Post, Profile, Trade, tradeStyleLabel } from '@/lib/types';

const TAB_ACCENT = '#10B981';

type TabKey = 'posts' | 'likes' | 'reposts';

const PROFILE_SELECT = `
  id, email, username, display_name, avatar_url, bio,
  trade_style, language, is_premium, nationality, is_verified, created_at
`;

type RawPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

export default function ProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const { profile, loading, refresh } = useProfile();
  const { trades } = useTrades();
  const badges = useMemo(() => computeBadges(trades), [trades]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);

  const [tab, setTab] = useState<TabKey>('posts');
  const [items, setItems] = useState<FeedCardItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const myId = session?.user.id ?? null;

  const loadCounts = useCallback(async () => {
    if (!myId) {
      setFollowerCount(0);
      setFollowingCount(0);
      setTradeCount(0);
      return;
    }
    const [followerRes, followingRes, tradesRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', myId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', myId),
      supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', myId)
        .eq('is_shared', true),
    ]);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
    setTradeCount(tradesRes.count ?? 0);
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
      if (!myId) {
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
              profile:profiles!posts_user_id_fkey (${PROFILE_SELECT})`,
            )
            .eq('user_id', myId)
            .eq('post_type', 'trade_result')
            .order('created_at', { ascending: false })
            .limit(50);
          const decorated = await decorateItems((data ?? []) as RawPost[]);
          setItems(decorated);
        } else if (which === 'likes') {
          const { data } = await supabase
            .from('likes')
            .select(
              `created_at,
              post:posts!likes_post_id_fkey (
                *,
                trade:trades!posts_trade_id_fkey (*),
                profile:profiles!posts_user_id_fkey (${PROFILE_SELECT})
              )`,
            )
            .eq('user_id', myId)
            .order('created_at', { ascending: false })
            .limit(50);
          type Row = { post: RawPost | null };
          const posts = ((data ?? []) as unknown as Row[])
            .map((r) => r.post)
            .filter((p): p is RawPost => p !== null);
          const decorated = await decorateItems(posts);
          setItems(decorated);
        } else {
          const { data } = await supabase
            .from('reposts')
            .select(
              `created_at,
              post:posts!reposts_post_id_fkey (
                *,
                trade:trades!posts_trade_id_fkey (*),
                profile:profiles!posts_user_id_fkey (${PROFILE_SELECT})
              )`,
            )
            .eq('user_id', myId)
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
        Alert.alert('読み込み失敗', msg);
      } finally {
        setTabLoading(false);
      }
    },
    [myId, decorateItems],
  );

  useFocusEffect(
    useCallback(() => {
      loadCounts();
      loadTab(tab);
    }, [loadCounts, loadTab, tab]),
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
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const toggleBookmark = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_bookmarked;
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_bookmarked: !was } : p,
      ),
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
        prev.map((p) =>
          p.id === item.id ? { ...p, is_bookmarked: was } : p,
        ),
      );
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const toggleRepost = async (item: FeedCardItem) => {
    if (!myId) return;
    const was = item.is_reposted;
    if (!was) {
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
        await supabase
          .from('reposts')
          .delete()
          .eq('user_id', myId)
          .eq('post_id', item.id);
      } else {
        await supabase
          .from('reposts')
          .insert({ user_id: myId, post_id: item.id });
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, is_reposted: was } : p,
        ),
      );
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const email = session?.user.email ?? '';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split('@')[0] ||
    'ユーザー';
  const username = profile?.username?.trim() || email.split('@')[0] || 'user';

  const country = findCountry(profile?.nationality ?? null);
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const styleText = tradeStyleLabel(profile?.trade_style);

  const tabs: { key: TabKey; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { key: 'posts', icon: 'grid-outline', label: '投稿' },
    { key: 'likes', icon: 'heart-outline', label: 'いいね' },
    { key: 'reposts', icon: 'repeat', label: 'リポスト' },
  ];

  const emptyMessage =
    tab === 'posts'
      ? 'まだ投稿がありません'
      : tab === 'likes'
        ? 'いいねした投稿はまだありません'
        : 'リポストした投稿はまだありません';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>プロフィール</Text>
        <Link href="/settings" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.settingsButtonPressed,
            ]}
            hitSlop={12}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={c.textPrimary}
            />
          </Pressable>
        </Link>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <Link href="/profile-edit" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.editIconButton,
                  pressed && styles.editIconButtonPressed,
                ]}
                hitSlop={12}
              >
                <Ionicons name="create-outline" size={22} color="#94A3B8" />
              </Pressable>
            </Link>
            <View style={styles.avatarWrap}>
              <Avatar
                uri={profile?.avatar_url}
                displayName={displayName}
                size={84}
              />
            </View>
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
                  <Text style={styles.metaText}>
                    {country?.name ?? profile?.nationality ?? ''}
                  </Text>
                </View>
              )}
              {profile?.trade_style && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={14}
                    color={c.textSecondary}
                  />
                  <Text style={styles.metaText}>{styleText}</Text>
                </View>
              )}
            </View>

            {profile?.bio && profile.bio.trim() !== '' && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}

            {badges.length > 0 && (
              <View style={styles.badgesRow}>
                {badges.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.badgeChip,
                      { borderColor: tierColor(b.tier) },
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                    <Text
                      style={[
                        styles.badgeLabel,
                        { color: tierColor(b.tier) },
                      ]}
                    >
                      {b.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tradeCount}</Text>
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

          {!loading && !profile && (
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>プロフィールを再読み込み</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tabBar}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => switchTab(t.key)}
                style={[
                  styles.tabButton,
                  active && styles.tabButtonActive,
                ]}
                hitSlop={4}
              >
                <Ionicons
                  name={t.icon}
                  size={22}
                  color={active ? TAB_ACCENT : c.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>
          {tabLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
            </View>
          ) : (
            items.map((item) => (
              <FeedCard
                key={`${tab}-${item.id}`}
                item={item}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
                onToggleRepost={toggleRepost}
              />
            ))
          )}
        </View>
      </ScrollView>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    settingsButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButtonPressed: {
      opacity: 0.7,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    profileSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 14,
    },
    profileCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 22,
      alignItems: 'center',
    },
    avatarWrap: {
      marginBottom: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    displayName: {
      fontSize: 19,
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
    editIconButton: {
      position: 'absolute',
      top: 12,
      left: 12,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    editIconButtonPressed: {
      opacity: 0.5,
    },
    retryButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    retryText: {
      color: c.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      width: SCREEN_WIDTH,
      height: 52,
      backgroundColor: c.background,
      marginTop: 16,
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
      borderBottomColor: TAB_ACCENT,
    },
    tabContent: {
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 10,
    },
    center: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyBox: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 14,
      color: c.textSecondary,
    },
  });
}
