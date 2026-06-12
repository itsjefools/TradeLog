import { Ionicons } from '@expo/vector-icons';
import { Router, useFocusEffect, useRouter } from 'expo-router';
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
import { EmptyState } from '@/components/empty-state';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { selectionFeedback } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type Vote = 'bull' | 'bear';
type PredFilter = 'open' | 'resolved' | 'popular';

/** 期限までの残り時間ラベル。期限なし→null、期限切れ→expired。 */
function countdownLabel(
  expiresAt: string | null,
  t: (k: string, p?: Record<string, unknown>) => string,
): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return t('predictions.expired');
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) return t('predictions.expiresInDays', { n: Math.floor(hours / 24) });
  if (hours >= 1) return t('predictions.expiresInHours', { n: hours });
  return t('predictions.expiresInHours', { n: 1 });
}

type Prediction = {
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
  expires_at: string | null;
  outcome: 'open' | 'win' | 'loss';
  created_at: string;
  bull_count: number;
  bear_count: number;
  my_vote: Vote | null;
  comment_count?: number;
  author_win_rate?: number | null;
  author_resolved?: number;
};

export default function PredictionsScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PredFilter>('open');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_predictions', { top_n: 50 });
    if (!error) setItems((data ?? []) as Prediction[]);
    setLoading(false);
  }, []);

  const visible = useMemo(() => {
    if (filter === 'resolved') return items.filter((p) => p.outcome !== 'open');
    if (filter === 'popular') {
      return [...items].sort(
        (a, b) => b.bull_count + b.bear_count - (a.bull_count + a.bear_count),
      );
    }
    return items.filter((p) => p.outcome === 'open');
  }, [items, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const castVote = async (pred: Prediction, v: Vote) => {
    selectionFeedback();
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const next = pred.my_vote === v ? null : v;

    // 楽観的更新
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== pred.id) return p;
        let bull = p.bull_count;
        let bear = p.bear_count;
        if (p.my_vote === 'bull') bull -= 1;
        if (p.my_vote === 'bear') bear -= 1;
        if (next === 'bull') bull += 1;
        if (next === 'bear') bear += 1;
        return { ...p, bull_count: bull, bear_count: bear, my_vote: next };
      }),
    );

    if (next === null) {
      await supabase
        .from('prediction_votes')
        .delete()
        .eq('prediction_id', pred.id)
        .eq('user_id', uid);
    } else {
      await supabase
        .from('prediction_votes')
        .upsert({ prediction_id: pred.id, user_id: uid, vote: next });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('predictions.title')}</Text>
        <Pressable onPress={() => router.push('/prediction-new')} hitSlop={12}>
          <Ionicons name="add-circle" size={26} color={c.accent} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['open', 'resolved', 'popular'] as PredFilter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => {
                selectionFeedback();
                setFilter(f);
              }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t(`predictions.filter_${f}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="pulse-outline"
          title={t('predictions.empty')}
          subtitle={t('predictions.emptySub')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {visible.map((p) => (
            <PredictionCard key={p.id} pred={p} onVote={castVote} router={router} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PredictionCard({
  pred,
  onVote,
  router,
}: {
  pred: Prediction;
  onVote: (p: Prediction, v: Vote) => void;
  router: Router;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const name = pred.display_name?.trim() || pred.username?.trim() || t('profile.defaultName');
  const total = pred.bull_count + pred.bear_count;
  const bullPct = total > 0 ? Math.round((pred.bull_count / total) * 100) : 50;
  const isLong = pred.direction === 'long';
  const dirColor = isLong ? c.win : c.loss;
  const countdown = pred.outcome === 'open' ? countdownLabel(pred.expires_at, t) : null;
  const expired = countdown === t('predictions.expired');

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHead} onPress={() => router.push(`/user/${pred.user_id}`)}>
        <Avatar
          uri={pred.avatar_url}
          displayName={name}
          size={36}
          profile={{ username: pred.username, is_verified: pred.is_verified }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {pred.username ? <Text style={styles.handle}>@{pred.username}</Text> : null}
        </View>
        {typeof pred.author_win_rate === 'number' && (pred.author_resolved ?? 0) >= 3 && (
          <View style={styles.winRateChip}>
            <Ionicons name="trophy" size={11} color={c.accent} />
            <Text style={styles.winRateText}>
              {t('predictions.winRate', { pct: pred.author_win_rate })}
            </Text>
          </View>
        )}
        {pred.outcome !== 'open' && (
          <View
            style={[
              styles.outcomeBadge,
              { backgroundColor: pred.outcome === 'win' ? c.win : c.loss },
            ]}
          >
            <Text style={styles.outcomeText}>
              {pred.outcome === 'win' ? t('predictions.win') : t('predictions.loss')}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.setupRow}>
        <Text style={styles.pair}>{pred.currency_pair}</Text>
        <View style={[styles.dirPill, { backgroundColor: dirColor }]}>
          <Ionicons name={isLong ? 'arrow-up' : 'arrow-down'} size={12} color="#fff" />
          <Text style={styles.dirText}>
            {isLong ? t('common.long') : t('common.short')}
          </Text>
        </View>
        {countdown && (
          <View style={styles.countdown}>
            <Ionicons
              name="time-outline"
              size={12}
              color={expired ? c.textSecondary : c.accent}
            />
            <Text
              style={[
                styles.countdownText,
                { color: expired ? c.textSecondary : c.accent },
              ]}
            >
              {countdown}
            </Text>
          </View>
        )}
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

      {/* 投票バー */}
      <View style={styles.voteBar}>
        <View style={[styles.voteFill, { width: `${bullPct}%`, backgroundColor: c.win }]} />
      </View>
      <View style={styles.voteRow}>
        <Pressable
          style={[styles.voteBtn, pred.my_vote === 'bull' && { borderColor: c.win, backgroundColor: c.win + '18' }]}
          onPress={() => onVote(pred, 'bull')}
        >
          <Ionicons name="trending-up" size={15} color={c.win} />
          <Text style={[styles.voteBtnText, { color: c.win }]}>
            {t('predictions.bull')} {pred.bull_count}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.voteBtn, pred.my_vote === 'bear' && { borderColor: c.loss, backgroundColor: c.loss + '18' }]}
          onPress={() => onVote(pred, 'bear')}
        >
          <Ionicons name="trending-down" size={15} color={c.loss} />
          <Text style={[styles.voteBtnText, { color: c.loss }]}>
            {t('predictions.bear')} {pred.bear_count}
          </Text>
        </Pressable>
      </View>

      {/* 詳細・コメント・投票者へ */}
      <Pressable
        style={styles.detailRow}
        onPress={() => router.push(`/prediction/${pred.id}`)}
      >
        <Ionicons name="chatbubble-outline" size={15} color={c.textSecondary} />
        <Text style={styles.detailText}>
          {t('predictions.commentsCount', { n: pred.comment_count ?? 0 })}
        </Text>
        <Ionicons name="people-outline" size={15} color={c.textSecondary} />
        <Text style={styles.detailText}>{total}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.detailLink}>{t('predictions.viewDetail')}</Text>
        <Ionicons name="chevron-forward" size={14} color={c.accent} />
      </Pressable>
    </View>
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: '#fff' },
    countdown: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
    countdownText: { fontSize: 12, fontWeight: '700' },
    body: { padding: 16, gap: 12, paddingBottom: 40 },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 10 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    handle: { fontSize: 12, color: c.textSecondary },
    outcomeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    outcomeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
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
    priceItem: { fontSize: 13, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] },
    priceLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    rationale: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
    voteBar: {
      height: 8,
      borderRadius: 999,
      backgroundColor: c.loss,
      overflow: 'hidden',
    },
    voteFill: { height: '100%', borderRadius: 999 },
    voteRow: { flexDirection: 'row', gap: 10 },
    voteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    voteBtnText: { fontSize: 13, fontWeight: '700' },
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
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    detailText: { fontSize: 12.5, color: c.textSecondary, fontWeight: '600', marginRight: 6 },
    detailLink: { fontSize: 12.5, color: c.accent, fontWeight: '700' },
  });
}
