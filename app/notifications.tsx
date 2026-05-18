import { Ionicons } from '@expo/vector-icons';
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
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { formatRelativeTime } from '@/lib/format-time';
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

type SectionKey = 'today' | 'yesterday' | 'thisWeek' | 'older';

function sectionFor(date: Date): SectionKey {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const ms = date.getTime();
  if (ms >= startOfToday) return 'today';
  if (ms >= startOfToday - 86400000) return 'yesterday';
  if (ms >= startOfToday - 6 * 86400000) return 'thisWeek';
  return 'older';
}

function groupByDay(items: NotificationItem[]) {
  const sections: { key: SectionKey; data: NotificationItem[] }[] = [];
  for (const it of items) {
    const k = sectionFor(new Date(it.created_at));
    let bucket = sections.find((s) => s.key === k);
    if (!bucket) {
      bucket = { key: k, data: [] };
      sections.push(bucket);
    }
    bucket.data.push(it);
  }
  return sections;
}

export default function NotificationsScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const SECTION_LABEL: Record<SectionKey, string> = {
    today: t('notifications.today'),
    yesterday: t('notifications.yesterday'),
    thisWeek: t('notifications.thisWeek'),
    older: t('notifications.older'),
  };
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { refresh: refreshUnread } = useUnreadCounts();
  const myId = session?.user.id ?? null;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sections = useMemo(() => groupByDay(items), [items]);

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
      await refreshUnread();
    }
  }, [myId, refreshUnread]);

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
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
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
              <Ionicons
                name="notifications-outline"
                size={48}
                color={c.textSecondary}
              />
              <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('notifications.emptyText')}</Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.key}>
                <Text style={styles.sectionLabel}>
                  {SECTION_LABEL[section.key]}
                </Text>
                {section.data.map((n) => (
                  <NotificationRow key={n.id} item={n} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const actor = item.actor;
  const fallbackName = actor?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    actor?.display_name?.trim() ||
    actor?.username?.trim() ||
    fallbackName;
  const dateStr = formatRelativeTime(item.created_at);

  const message =
    item.type === 'like'
      ? t('notifications.likedYourPost')
      : item.type === 'comment'
        ? t('notifications.commentedYourPost')
        : item.type === 'follow'
          ? t('notifications.followedYou')
          : item.type === 'mention'
            ? t('notifications.mentionedYou')
            : item.type === 'repost'
              ? t('notifications.repostedYourPost')
              : t('notifications.fromUser');

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
      <Avatar
        uri={actor?.avatar_url}
        displayName={displayName}
        size={40}
        profile={actor}
        onPress={actor ? () => router.push(`/user/${item.actor_id}`) : undefined}
      />
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
      borderRadius: 10,
      padding: 32,
      alignItems: 'center',
      marginTop: 24,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 4,
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 16,
      marginBottom: 6,
      marginLeft: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
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
      borderRadius: 8,
      backgroundColor: c.accent,
    },
  });
}
