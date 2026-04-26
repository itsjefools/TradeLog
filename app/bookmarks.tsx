import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '@/lib/supabase';
import { Post, Profile, Trade } from '@/lib/types';

const PROFILE_FRAG = `
  id, email, username, display_name, avatar_url, bio,
  trade_style, language, is_premium, nationality, is_verified, created_at
`;

type BookmarkRow = {
  created_at: string;
  post: (Post & { trade: Trade | null; profile: Profile | null }) | null;
};

export default function BookmarksScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [items, setItems] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('bookmarks')
      .select(
        `created_at,
         post:posts!bookmarks_post_id_fkey (
           *,
           trade:trades!posts_trade_id_fkey (*),
           profile:profiles!posts_user_id_fkey (${PROFILE_FRAG})
         )`,
      )
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setItems(((data ?? []) as unknown) as BookmarkRow[]);
    setLoading(false);
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>ブックマーク</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {items.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>ブックマークがありません</Text>
              <Text style={styles.emptyText}>
                フィードの投稿で🔖アイコンをタップすると{'\n'}
                ここに保存されます。
              </Text>
            </View>
          )}

          {items.map((bm) => bm.post && (
            <BookmarkCard key={bm.post.id} item={bm.post} router={router} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BookmarkCard({
  item,
  router,
}: {
  item: Post & { trade: Trade | null; profile: Profile | null };
  router: ReturnType<typeof useRouter>;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const profile = item.profile;
  const trade = item.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/comments?postId=${item.id}`)}
    >
      <View style={styles.cardHead}>
        <Avatar uri={profile?.avatar_url} displayName={displayName} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          {trade && (
            <Text style={styles.tradeMeta}>
              {trade.currency_pair} ·{' '}
              {trade.direction === 'long' ? 'ロング' : 'ショート'}
            </Text>
          )}
        </View>
        {trade && trade.pnl !== null && (
          <Text style={[styles.pnl, pnlColor(trade.pnl, c)]}>
            {formatPnl(trade.pnl)}
          </Text>
        )}
        <Ionicons name="bookmark" size={16} color={c.accent} />
      </View>
      {item.content && item.content.trim() !== '' && (
        <Text style={styles.content} numberOfLines={3}>
          {item.content}
        </Text>
      )}
    </Pressable>
  );
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 16, gap: 8 },
    errorBox: { backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8 },
    errorText: { color: '#FECACA', fontSize: 13 },
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
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    cardPressed: { opacity: 0.7 },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    userName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    tradeMeta: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
    pnl: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    content: { fontSize: 13, color: c.textPrimary, lineHeight: 18 },
  });
}
