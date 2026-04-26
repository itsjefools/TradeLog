import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

type NotificationItem = {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  post_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: Profile | null;
};

export default function NotificationsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select(
        `*,
        actor:profiles!notifications_actor_id_fkey (
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
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as NotificationItem[]);
    setLoading(false);

    // 未読を全て既読に
    const unreadIds = (data ?? [])
      .filter((n: { is_read: boolean }) => !n.is_read)
      .map((n: { id: string }) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
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
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>通知</Text>
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

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>通知はまだありません</Text>
              <Text style={styles.emptyText}>
                いいね・コメント・フォローがあると{'\n'}
                ここに表示されます。
              </Text>
            </View>
          ) : (
            items.map((n) => <NotificationRow key={n.id} item={n} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const actor = item.actor;
  const fallbackName = actor?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    actor?.display_name?.trim() ||
    actor?.username?.trim() ||
    fallbackName;
  const date = new Date(item.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const message =
    item.type === 'like'
      ? 'があなたの投稿にいいねしました'
      : item.type === 'comment'
        ? 'があなたの投稿にコメントしました'
        : item.type === 'follow'
          ? 'があなたをフォローしました'
          : 'からの通知';

  const handlePress = () => {
    if (item.type === 'follow') {
      router.push(`/user/${item.actor_id}`);
    } else if (item.post_id) {
      router.push(`/comments?postId=${item.post_id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        !item.is_read && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
    >
      <Avatar uri={actor?.avatar_url} displayName={displayName} size={40} />
      <View style={styles.body2}>
        <Text style={styles.text}>
          <Text style={styles.actorName}>{displayName}</Text>
          {actor?.is_verified ? ' ✓ ' : ''}
          <Text style={styles.message}>{message}</Text>
        </Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </Pressable>
  );
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
      color: c.textSecondary,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      padding: 12,
      gap: 4,
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    rowUnread: {
      backgroundColor: c.surfaceAlt,
    },
    rowPressed: {
      opacity: 0.7,
    },
    body2: {
      flex: 1,
    },
    text: {
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 18,
    },
    actorName: {
      fontWeight: '700',
    },
    message: {
      color: c.textSecondary,
    },
    date: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
    },
  });
}
