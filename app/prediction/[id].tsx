import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { notifySuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type Pred = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  currency_pair: string;
  direction: 'long' | 'short';
  entry_price: number | null;
  target_price: number | null;
  stop_price: number | null;
  rationale: string | null;
  outcome: 'open' | 'win' | 'loss';
  bull_count: number;
  bear_count: number;
  author_win_rate: number | null;
  author_resolved: number;
};

type Voter = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  vote: 'bull' | 'bear';
};

type Comment = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  content: string;
  created_at: string;
};

export default function PredictionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [pred, setPred] = useState<Pred | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p, v, co] = await Promise.all([
      supabase.rpc('get_prediction', { p_id: id }),
      supabase.rpc('get_prediction_voters', { p_id: id }),
      supabase.rpc('get_prediction_comments', { p_id: id }),
    ]);
    if (!p.error && p.data && p.data.length > 0) setPred(p.data[0] as Pred);
    if (!v.error && v.data) setVoters(v.data as Voter[]);
    if (!co.error && co.data) setComments(co.data as Comment[]);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const postComment = async () => {
    const content = text.trim();
    if (!content) return;
    const uid = session?.user.id;
    if (!uid || !id) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('prediction_comments')
        .insert({ prediction_id: id, user_id: uid, content });
      if (error) throw new Error(error.message);
      notifySuccess();
      setText('');
      toast.success(t('predictions.commentPosted'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const bullVoters = voters.filter((v) => v.vote === 'bull');
  const bearVoters = voters.filter((v) => v.vote === 'bear');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('predictions.detailTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : !pred ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t('predictions.notFound')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <PredSummary pred={pred} c={c} styles={styles} t={t} router={router} />

            {/* 投票者 */}
            <Text style={styles.sectionLabel}>{t('predictions.voters')}</Text>
            {voters.length === 0 ? (
              <Text style={styles.muted}>{t('predictions.noVoters')}</Text>
            ) : (
              <View style={styles.votersWrap}>
                <VoterColumn
                  label={t('predictions.bull')}
                  color={c.win}
                  voters={bullVoters}
                  c={c}
                  styles={styles}
                  router={router}
                />
                <VoterColumn
                  label={t('predictions.bear')}
                  color={c.loss}
                  voters={bearVoters}
                  c={c}
                  styles={styles}
                  router={router}
                />
              </View>
            )}

            {/* コメント */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
              {t('predictions.comments')} {comments.length > 0 ? `(${comments.length})` : ''}
            </Text>
            {comments.length === 0 ? (
              <Text style={styles.muted}>{t('predictions.noComments')}</Text>
            ) : (
              comments.map((cm) => {
                const nm = cm.display_name?.trim() || cm.username?.trim() || 'Trader';
                return (
                  <View key={cm.id} style={styles.commentRow}>
                    <Pressable onPress={() => router.push(`/user/${cm.user_id}`)}>
                      <Avatar
                        uri={cm.avatar_url}
                        displayName={nm}
                        size={32}
                        profile={{ username: cm.username, is_verified: cm.is_verified }}
                      />
                    </Pressable>
                    <View style={styles.flex}>
                      <Text style={styles.commentName}>{nm}</Text>
                      <Text style={styles.commentText}>{cm.content}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('predictions.commentPlaceholder')}
              placeholderTextColor={c.textSecondary}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
              onPress={postComment}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color={c.onAccent} />
              ) : (
                <Ionicons name="send" size={18} color={c.onAccent} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function PredSummary({
  pred,
  c,
  styles,
  t,
  router,
}: {
  pred: Pred;
  c: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  t: (k: string, p?: Record<string, unknown>) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const name = pred.display_name?.trim() || pred.username?.trim() || 'Trader';
  const isLong = pred.direction === 'long';
  const total = pred.bull_count + pred.bear_count;
  const bullPct = total > 0 ? Math.round((pred.bull_count / total) * 100) : 50;
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHead} onPress={() => router.push(`/user/${pred.user_id}`)}>
        <Avatar
          uri={pred.avatar_url}
          displayName={name}
          size={36}
          profile={{ username: pred.username, is_verified: pred.is_verified }}
        />
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {pred.username ? <Text style={styles.handle}>@{pred.username}</Text> : null}
        </View>
        {typeof pred.author_win_rate === 'number' && pred.author_resolved >= 3 && (
          <View style={styles.winRateChip}>
            <Ionicons name="trophy" size={11} color={c.accent} />
            <Text style={styles.winRateText}>
              {t('predictions.winRate', { pct: pred.author_win_rate })}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.setupRow}>
        <Text style={styles.pair}>{pred.currency_pair}</Text>
        <View style={[styles.dirPill, { backgroundColor: isLong ? c.win : c.loss }]}>
          <Ionicons name={isLong ? 'arrow-up' : 'arrow-down'} size={12} color="#fff" />
          <Text style={styles.dirText}>{isLong ? t('common.long') : t('common.short')}</Text>
        </View>
      </View>

      {(pred.entry_price !== null || pred.target_price !== null || pred.stop_price !== null) && (
        <View style={styles.priceRow}>
          {pred.entry_price !== null && (
            <Text style={styles.priceItem}>
              <Text style={styles.priceLabel}>{t('predictions.entry')} </Text>
              {pred.entry_price}
            </Text>
          )}
          {pred.target_price !== null && (
            <Text style={[styles.priceItem, { color: c.win }]}>
              <Text style={styles.priceLabel}>TP </Text>
              {pred.target_price}
            </Text>
          )}
          {pred.stop_price !== null && (
            <Text style={[styles.priceItem, { color: c.loss }]}>
              <Text style={styles.priceLabel}>SL </Text>
              {pred.stop_price}
            </Text>
          )}
        </View>
      )}

      {pred.rationale ? <Text style={styles.rationale}>{pred.rationale}</Text> : null}

      <View style={styles.voteBar}>
        <View style={[styles.voteFill, { width: `${bullPct}%`, backgroundColor: c.win }]} />
      </View>
      <View style={styles.voteLabels}>
        <Text style={[styles.voteLabelText, { color: c.win }]}>
          {t('predictions.bull')} {pred.bull_count}
        </Text>
        <Text style={[styles.voteLabelText, { color: c.loss }]}>
          {t('predictions.bear')} {pred.bear_count}
        </Text>
      </View>
    </View>
  );
}

function VoterColumn({
  label,
  color,
  voters,
  c,
  styles,
  router,
}: {
  label: string;
  color: string;
  voters: Voter[];
  c: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <View style={styles.voterCol}>
      <Text style={[styles.voterColLabel, { color }]}>
        {label} {voters.length}
      </Text>
      {voters.map((v) => {
        const nm = v.display_name?.trim() || v.username?.trim() || 'Trader';
        return (
          <Pressable
            key={v.user_id}
            style={styles.voterRow}
            onPress={() => router.push(`/user/${v.user_id}`)}
          >
            <Avatar
              uri={v.avatar_url}
              displayName={nm}
              size={26}
              profile={{ username: v.username, is_verified: v.is_verified }}
            />
            <Text style={styles.voterName} numberOfLines={1}>{nm}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    muted: { fontSize: 13, color: c.textSecondary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    body: { padding: 16, paddingBottom: 24 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 18,
      marginBottom: 10,
    },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 10 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    handle: { fontSize: 12, color: c.textSecondary },
    winRateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${c.accent}14`,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    winRateText: { fontSize: 11, fontWeight: '800', color: c.accent },
    setupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pair: { fontSize: 18, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.5 },
    dirPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    dirText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    priceItem: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    priceLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    rationale: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
    voteBar: { height: 8, borderRadius: 999, backgroundColor: c.loss, overflow: 'hidden' },
    voteFill: { height: '100%', borderRadius: 999 },
    voteLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    voteLabelText: { fontSize: 13, fontWeight: '700' },
    votersWrap: { flexDirection: 'row', gap: 12 },
    voterCol: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    voterColLabel: { fontSize: 12, fontWeight: '800' },
    voterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    voterName: { flex: 1, fontSize: 12.5, color: c.textPrimary },
    commentRow: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    commentName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    commentText: { fontSize: 14, color: c.textPrimary, lineHeight: 20, marginTop: 2 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      padding: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: c.textPrimary,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
