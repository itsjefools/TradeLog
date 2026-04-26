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
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Conversation = {
  partner_id: string;
  partner_username: string | null;
  partner_display_name: string | null;
  partner_avatar_url: string | null;
  partner_is_verified: boolean | null;
  last_message_id: string;
  last_message_content: string;
  last_message_at: string;
  last_message_sender_id: string;
  unread_count: number;
};

export default function MessagesScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('get_conversations');
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setConvs((data ?? []) as Conversation[]);
    setLoading(false);
  }, []);

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
        <Text style={styles.headerTitle}>メッセージ</Text>
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

          {convs.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>メッセージがありません</Text>
              <Text style={styles.emptyText}>
                ユーザーのプロフィールから{'\n'}
                メッセージを送信できます。
              </Text>
            </View>
          )}

          {convs.map((conv) => (
            <ConversationRow
              key={conv.partner_id}
              conv={conv}
              onPress={() => router.push(`/dm/${conv.partner_id}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ConversationRow({
  conv,
  onPress,
}: {
  conv: Conversation;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = 'ユーザー';
  const displayName =
    conv.partner_display_name?.trim() ||
    conv.partner_username?.trim() ||
    fallbackName;
  const date = new Date(conv.last_message_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar
        uri={conv.partner_avatar_url}
        displayName={displayName}
        size={48}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.rowName} numberOfLines={1}>
            {displayName}
          </Text>
          {conv.partner_is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
          <Text style={styles.rowDate}>{dateStr}</Text>
        </View>
        <Text style={styles.rowMsg} numberOfLines={1}>
          {conv.last_message_content}
        </Text>
      </View>
      {conv.unread_count > 0 && (
        <View style={styles.unreadBubble}>
          <Text style={styles.unreadText}>{conv.unread_count}</Text>
        </View>
      )}
    </Pressable>
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 12, gap: 4 },
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 4,
    },
    rowPressed: { opacity: 0.7 },
    rowBody: { flex: 1 },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rowName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    verifiedBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
    rowDate: {
      marginLeft: 'auto',
      fontSize: 11,
      color: c.textSecondary,
    },
    rowMsg: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    unreadBubble: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  });
}
