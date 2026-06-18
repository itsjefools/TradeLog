import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GOLD, ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Earning = {
  community_id: string;
  period: string;
  creator_amount: number;
  status: string;
};

type PayoutStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

type Payout = {
  id: string;
  period: string;
  amount: number;
  status: string;
  paid_at: string | null;
};

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

export default function CommunityEarningsScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);

  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>('unverified');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const [{ data: earn }, { data: comms }, { data: acct }, { data: po }] =
      await Promise.all([
        supabase
          .from('community_earnings')
          .select('community_id, period, creator_amount, status')
          .eq('creator_id', myId),
        supabase.from('communities').select('id, name').eq('owner_id', myId),
        supabase
          .from('creator_payout_accounts')
          .select('status, payouts_enabled')
          .eq('user_id', myId)
          .maybeSingle(),
        supabase
          .from('creator_payouts')
          .select('id, period, amount, status, paid_at')
          .eq('creator_id', myId)
          .order('created_at', { ascending: false })
          .limit(24),
      ]);
    setEarnings((earn ?? []) as Earning[]);
    const map: Record<string, string> = {};
    for (const r of comms ?? []) map[(r as { id: string }).id] = (r as { name: string }).name;
    setNames(map);
    setPayoutStatus(
      acct?.payouts_enabled
        ? 'verified'
        : ((acct?.status as PayoutStatus) ?? 'unverified'),
    );
    setPayouts((po ?? []) as Payout[]);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const period = currentPeriod();
    let total = 0;
    let pending = 0;
    let thisMonth = 0;
    const byCommunity: Record<string, number> = {};
    for (const e of earnings) {
      total += e.creator_amount;
      if (e.status === 'pending') pending += e.creator_amount;
      if (e.period === period) thisMonth += e.creator_amount;
      byCommunity[e.community_id] = (byCommunity[e.community_id] ?? 0) + e.creator_amount;
    }
    const rows = Object.entries(byCommunity)
      .map(([id, amount]) => ({ id, amount }))
      .sort((a, b) => b.amount - a.amount);
    return { total, pending, thisMonth, rows };
  }, [earnings]);

  const payoutLabel: Record<PayoutStatus, string> = {
    unverified: t('community.payout_unverified'),
    pending: t('community.payout_pending'),
    verified: t('community.payout_verified'),
    rejected: t('community.payout_rejected'),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('community.earnings_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* 累計（大きく） */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>{t('community.earnings_total')}</Text>
            <Text style={styles.heroValue}>{yen(summary.total)}</Text>
            <Text style={styles.heroNote}>{t('community.earnings_share_note')}</Text>
          </View>

          {/* 今月 / 未払い */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('community.earnings_this_month')}</Text>
              <Text style={styles.statValue}>{yen(summary.thisMonth)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('community.earnings_pending')}</Text>
              <Text style={[styles.statValue, { color: GOLD }]}>
                {yen(summary.pending)}
              </Text>
            </View>
          </View>

          {/* 振込先設定への導線 */}
          <Pressable
            onPress={() => router.push('/school/community-payout')}
            style={styles.payoutRow}
          >
            <View style={styles.payoutLeft}>
              <Ionicons name="card-outline" size={18} color={c.textSecondary} />
              <Text style={styles.payoutLabel}>{t('community.payout_status_label')}</Text>
            </View>
            <View style={styles.payoutRight}>
              <Text
                style={[
                  styles.payoutValue,
                  payoutStatus === 'verified' && { color: c.accent },
                  payoutStatus === 'unverified' && { color: GOLD },
                ]}
              >
                {payoutLabel[payoutStatus]}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
            </View>
          </Pressable>

          {/* コミュニティ別 */}
          <Text style={styles.sectionLabel}>{t('community.earnings_by_community')}</Text>
          {summary.rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('community.earnings_empty')}</Text>
            </View>
          ) : (
            summary.rows.map((r) => (
              <View key={r.id} style={styles.commRow}>
                <Text style={styles.commName} numberOfLines={1}>
                  {names[r.id] ?? '—'}
                </Text>
                <Text style={styles.commAmount}>{yen(r.amount)}</Text>
              </View>
            ))
          )}

          {/* 出金履歴 */}
          <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
            {t('community.payout_history')}
          </Text>
          {payouts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('community.payout_history_empty')}</Text>
            </View>
          ) : (
            payouts.map((p) => {
              const paid = p.status === 'paid';
              return (
                <View key={p.id} style={styles.commRow}>
                  <View>
                    <Text style={styles.commName}>{p.period}</Text>
                    <Text
                      style={[
                        styles.payoutState,
                        { color: paid ? c.accent : c.textSecondary },
                      ]}
                    >
                      {t(`community.payout_state_${p.status}`)}
                      {paid && p.paid_at
                        ? ` · ${new Date(p.paid_at).toLocaleDateString()}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.commAmount}>{yen(p.amount)}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
    headerSpacer: { width: 26 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 20, paddingBottom: 60 },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 20,
      marginBottom: 12,
    },
    heroLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 6 },
    heroValue: {
      fontSize: 34,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    heroNote: { fontSize: 11, color: c.textSecondary, marginTop: 8, opacity: 0.8 },
    statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
    },
    statLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 6 },
    statValue: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    payoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 24,
    },
    payoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    payoutLabel: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
    payoutRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    payoutValue: { fontSize: 13, color: c.textSecondary, fontWeight: '700' },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 12,
    },
    sectionLabelMt: { marginTop: 28 },
    payoutState: { fontSize: 11, fontWeight: '700', marginTop: 3 },
    emptyBox: { paddingVertical: 32, alignItems: 'center' },
    emptyText: { fontSize: 13, color: c.textSecondary },
    commRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    commName: { fontSize: 14, color: c.textPrimary, flex: 1, marginRight: 12 },
    commAmount: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  });
}
