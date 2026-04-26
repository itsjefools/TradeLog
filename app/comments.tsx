import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { MentionText } from '@/components/mention-text';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Comment, Profile } from '@/lib/types';

type CommentItem = Comment & {
  profile: Profile | null;
};

const PROFILE_FRAG = `
  id, email, username, display_name, avatar_url, bio,
  trade_style, language, is_premium, nationality, is_verified, created_at
`;

export default function CommentsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select(
        `*,
        profile:profiles!comments_user_id_fkey (${PROFILE_FRAG})`,
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setComments((data ?? []) as CommentItem[]);
    }
    setLoading(false);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSend = async () => {
    if (!myId || !postId) {
      Alert.alert('ログインが必要です');
      return;
    }
    const content = text.trim();
    if (content === '') return;
    setPosting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          user_id: myId,
          post_id: postId,
          parent_id: replyTo?.id ?? null,
          content,
        })
        .select(
          `*,
          profile:profiles!comments_user_id_fkey (${PROFILE_FRAG})`,
        )
        .single();
      if (insertError) throw new Error(insertError.message);
      setComments((prev) => [...prev, data as CommentItem]);
      setText('');
      setReplyTo(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('送信失敗', msg);
    } finally {
      setPosting(false);
    }
  };

  // 親 -> 子のツリー構造を組み立て
  const tree = useMemo(() => buildTree(comments), [comments]);

  const startReply = (cm: CommentItem) => {
    setReplyTo(cm);
    const username = cm.profile?.username?.trim();
    if (username && !text.includes(`@${username}`)) {
      setText((prev) => (prev === '' ? `@${username} ` : `${prev} @${username} `));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>コメント</Text>
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
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {tree.length === 0 ? (
              <Text style={styles.empty}>
                まだコメントがありません。{'\n'}最初のコメントを書きましょう。
              </Text>
            ) : (
              tree.map((node) => (
                <CommentNode
                  key={node.comment.id}
                  node={node}
                  depth={0}
                  onReply={startReply}
                />
              ))
            )}
          </ScrollView>
        )}

        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              返信先: {replyTo.profile?.display_name ?? replyTo.profile?.username ?? 'ユーザー'}
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={6}>
              <Text style={styles.replyCancel}>×</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={replyTo ? '返信を書く...' : 'コメントを書く...'}
            placeholderTextColor={c.textSecondary}
            multiline
            editable={!posting}
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              text.trim() === '' || posting
                ? styles.sendButtonDisabled
                : null,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={text.trim() === '' || posting}
          >
            {posting ? (
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

type TreeNode = {
  comment: CommentItem;
  children: TreeNode[];
};

function buildTree(comments: CommentItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const c of comments) {
    map.set(c.id, { comment: c, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentNode({
  node,
  depth,
  onReply,
}: {
  node: TreeNode;
  depth: number;
  onReply: (cm: CommentItem) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const cm = node.comment;
  const profile = cm.profile;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;
  const date = new Date(cm.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const indent = Math.min(depth, 2) * 28;

  return (
    <View>
      <View style={[styles.commentRow, { paddingLeft: indent }]}>
        <Pressable onPress={() => router.push(`/user/${cm.user_id}`)}>
          <Avatar uri={profile?.avatar_url} displayName={displayName} size={depth === 0 ? 36 : 28} />
        </Pressable>
        <View style={styles.commentBody}>
          <View style={styles.commentHead}>
            <Text style={styles.commentName} numberOfLines={1}>
              {displayName}
            </Text>
            {profile?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
            <Text style={styles.commentUsername}>@{username}</Text>
            <Text style={styles.commentDate}>{dateStr}</Text>
          </View>
          <MentionText content={cm.content} style={styles.commentText} />
          <Pressable onPress={() => onReply(cm)} hitSlop={6}>
            <Text style={styles.replyLink}>返信</Text>
          </Pressable>
        </View>
      </View>
      {node.children.map((child) => (
        <CommentNode
          key={child.comment.id}
          node={child}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 16, paddingBottom: 32, gap: 8 },
    errorBox: { backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8 },
    errorText: { color: '#FECACA', fontSize: 13 },
    empty: {
      paddingVertical: 32,
      textAlign: 'center',
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
    },
    commentRow: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 8,
    },
    commentBody: { flex: 1 },
    commentHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    commentName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    verifiedBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
    commentUsername: { fontSize: 11, color: c.textSecondary },
    commentDate: { fontSize: 11, color: c.textSecondary, marginLeft: 'auto' },
    commentText: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
    replyLink: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      marginTop: 4,
    },
    replyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: c.surfaceAlt,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    replyBannerText: { flex: 1, fontSize: 12, color: c.textSecondary },
    replyCancel: { fontSize: 18, color: c.textSecondary, paddingHorizontal: 8 },
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
