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
};

export default function PredictionsScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_predictions', { top_n: 50 });
    if (!error) setItems((data ?? []) as Prediction[]);
    setLoading(false);
  }, []);

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="bulb-outline"
          title={t('predictions.empty')}
          subtitle={t('predictions.emptySub')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {items.map((p) => (
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
  });
}
