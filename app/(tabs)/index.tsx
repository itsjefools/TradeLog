import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedCard, FeedCardItem } from '@/components/feed-card';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Post, Profile, Trade } from '@/lib/types';

type FeedItem = FeedCardItem;

export default function FeedScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadFeed = useCallback(async () => {
    setError(null);
    try {
      const posts = await loadAllFeed();

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
  }, [myId, loadAllFeed]);

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
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 10,
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
  });
}
