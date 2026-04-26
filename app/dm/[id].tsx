import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export default function DMThreadScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id: partnerId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [partner, setPartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const load = useCallback(async () => {
    if (!partnerId || !myId) return;
    const [partnerRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle(),
      supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`,
        )
        .order('created_at', { ascending: true })
        .limit(200),
    ]);
    setPartner((partnerRes.data ?? null) as Profile | null);
    setMessages((msgRes.data ?? []) as Message[]);
    setLoading(false);

    // 自分宛の未読を既読化
    const unreadIds = ((msgRes.data ?? []) as Message[])
      .filter((m) => m.receiver_id === myId && m.read_at === null)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }
  }, [partnerId, myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Realtime: 新しいメッセージを購読
  useEffect(() => {
    if (!partnerId || !myId) return;
    const channel = supabase
      .channel(`dm:${[myId, partnerId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const m = payload.new as Message;
          // この会話に関係するメッセージだけ追加
          if (
            (m.sender_id === myId && m.receiver_id === partnerId) ||
            (m.sender_id === partnerId && m.receiver_id === myId)
          ) {
            setMessages((prev) => {
              if (prev.some((p) => p.id === m.id)) return prev;
              return [...prev, m];
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, myId]);

  // メッセージが増えたら最下部にスクロール
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const send = async () => {
    if (!myId || !partnerId || sending) return;
    const content = text.trim();
    if (content === '') return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: myId,
        receiver_id: partnerId,
        content,
      });
      if (error) throw new Error(error.message);
      setText('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('送信失敗', msg);
    } finally {
      setSending(false);
    }
  };

  const fallbackName = partner?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    partner?.display_name?.trim() ||
    partner?.username?.trim() ||
    fallbackName;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>← 戻る</Text>
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => partnerId && router.push(`/user/${partnerId}`)}
        >
          {partner && (
            <Avatar
              uri={partner.avatar_url}
              displayName={displayName}
              size={28}
            />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {messages.length === 0 ? (
              <Text style={styles.empty}>
                まだメッセージがありません。{'\n'}最初のメッセージを送りましょう。
              </Text>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} myId={myId} />
              ))
            )}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="メッセージを入力..."
            placeholderTextColor={c.textSecondary}
            multiline
            editable={!sending}
            maxLength={1000}
          />
          <Pressable
            onPress={send}
            disabled={text.trim() === '' || sending}
            style={({ pressed }) => [
              styles.sendButton,
              (text.trim() === '' || sending) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>送信</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  myId,
}: {
  message: Message;
  myId: string | null;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const isMine = message.sender_id === myId;
  const date = new Date(message.created_at);
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isMine && styles.bubbleTextMine,
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text style={styles.bubbleTime}>{time}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: { fontSize: 15, color: c.accent, minWidth: 56 },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      maxWidth: 200,
    },
    headerSpacer: { width: 56 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 12, gap: 4 },
    empty: {
      paddingVertical: 32,
      textAlign: 'center',
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
    },
    bubbleRow: {
      maxWidth: '80%',
      marginBottom: 6,
    },
    bubbleRowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    bubbleRowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    bubbleMine: { backgroundColor: c.accent, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: c.surface, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, color: c.textPrimary, lineHeight: 19 },
    bubbleTextMine: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: c.textSecondary, marginTop: 2 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: c.textPrimary,
      maxHeight: 120,
    },
    sendButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.accent,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 56,
      minHeight: 36,
    },
    sendButtonDisabled: { opacity: 0.4 },
    sendButtonPressed: { opacity: 0.85 },
    sendButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  });
}
