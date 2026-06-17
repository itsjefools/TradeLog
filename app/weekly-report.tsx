import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { Trade } from '@/lib/types';

const DAY = 86_400_000;

type WeekStats = {
  count: number;
  netPnl: number;
  winRate: number | null;
  profitFactor: number | null;
  best: Trade | null;
  worst: Trade | null;
  topPair: { pair: string; pnl: number } | null;
  maxLossStreak: number;
};

function computeWeek(trades: Trade[], fromMs: number, toMs: number): WeekStats {
  const inRange = trades.filter((t) => {
    const ts = new Date(t.traded_at).getTime();
    return ts >= fromMs && ts < toMs;
  });
  const withPnl = inRange.filter((t) => t.pnl !== null);
  const netPnl = withPnl.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const withResult = inRange.filter((t) => t.result !== null);
  const wins = withResult.filter((t) => t.result === 'win').length;
  const winRate =
    withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : null;
  const grossWin = withPnl
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    withPnl.filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0),
  );
  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;

  let best: Trade | null = null;
  let worst: Trade | null = null;
  for (const t of withPnl) {
    if (best === null || (t.pnl ?? 0) > (best.pnl ?? 0)) best = t;
    if (worst === null || (t.pnl ?? 0) < (worst.pnl ?? 0)) worst = t;
  }

  const pairMap = new Map<string, number>();
  for (const t of withPnl) {
    pairMap.set(t.currency_pair, (pairMap.get(t.currency_pair) ?? 0) + (t.pnl ?? 0));
  }
  let topPair: { pair: string; pnl: number } | null = null;
  for (const [pair, pnl] of pairMap.entries()) {
    if (topPair === null || pnl > topPair.pnl) topPair = { pair, pnl };
  }

  // 連敗(期間内, 約定時刻順)
  const ordered = [...withResult].sort(
    (a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
  );
  let maxLossStreak = 0;
  let cur = 0;
  for (const t of ordered) {
    if (t.result === 'loss') {
      cur += 1;
      if (cur > maxLossStreak) maxLossStreak = cur;
    } else cur = 0;
  }

  return {
    count: inRange.length,
    netPnl,
    winRate,
    profitFactor,
    best,
    worst,
    topPair,
    maxLossStreak,
  };
}

export default function WeeklyReportScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const { trades } = useTrades();
  const fmt = useCallback(
    (n: number) => formatPnlWithCurrency(n, currency),
    [currency],
  );

  const { week, prev } = useMemo(() => {
    const now = Date.now();
    return {
      week: computeWeek(trades, now - 7 * DAY, now),
      prev: computeWeek(trades, now - 14 * DAY, now - 7 * DAY),
    };
  }, [trades]);

  const delta = week.netPnl - prev.netPnl;
  const heroColor = week.netPnl > 0 ? c.win : week.netPnl < 0 ? c.loss : c.textPrimary;

  const insights = useMemo(() => {
    const out: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }[] = [];
    if (week.count === 0) return out;
    if (prev.count > 0 && delta !== 0) {
      out.push(
        delta > 0
          ? { icon: 'trending-up', color: c.win, text: t('weeklyReport.insight_up', { v: fmt(delta) }) }
          : { icon: 'trending-down', color: c.loss, text: t('weeklyReport.insight_down', { v: fmt(delta) }) },
      );
    }
    if (week.topPair && week.topPair.pnl > 0) {
      out.push({
        icon: 'star',
        color: c.win,
        text: t('weeklyReport.insight_best_pair', {
          pair: week.topPair.pair,
          pnl: fmt(week.topPair.pnl),
        }),
      });
    }
    if (week.profitFactor !== null && week.profitFactor !== Infinity && week.profitFactor >= 1.5) {
      out.push({
        icon: 'checkmark-circle',
        color: c.win,
        text: t('weeklyReport.insight_solid', { pf: week.profitFactor.toFixed(2) }),
      });
    }
    if (week.maxLossStreak >= 3) {
      out.push({
        icon: 'warning',
        color: c.loss,
        text: t('weeklyReport.insight_tilt', { count: week.maxLossStreak }),
      });
    }
    return out;
  }, [week, prev, delta, c, t, fmt]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('weeklyReport.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {week.count === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t('weeklyReport.empty')}
          subtitle={t('weeklyReport.emptySub')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* ヒーロー */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>{t('weeklyReport.thisWeek')}</Text>
            <Text style={[styles.heroValue, { color: heroColor }]}>{fmt(week.netPnl)}</Text>
            {prev.count > 0 && (
              <Text style={styles.heroDelta}>
                {t('weeklyReport.vsLastWeek')}{' '}
                <Text style={{ color: delta >= 0 ? c.win : c.loss, fontWeight: '700' }}>
                  {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}
                </Text>
              </Text>
            )}
          </View>

          {/* KPI */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('weeklyReport.trades')}</Text>
              <Text style={styles.kpiValue}>{week.count}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('stats.win_rate')}</Text>
              <Text style={styles.kpiValue}>
                {week.winRate === null ? '—' : `${week.winRate}%`}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('stats.profit_factor')}</Text>
              <Text style={styles.kpiValue}>
                {week.profitFactor === null
                  ? '—'
                  : week.profitFactor === Infinity
                    ? '∞'
                    : week.profitFactor.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* ベスト/ワースト */}
          <View style={styles.kpiRow}>
            <View style={styles.tradeCard}>
              <Text style={styles.kpiLabel}>{t('weeklyReport.bestTrade')}</Text>
              {week.best && week.best.pnl !== null ? (
                <>
                  <Text style={[styles.tradeVal, { color: c.win }]}>{fmt(week.best.pnl)}</Text>
                  <Text style={styles.tradePair}>{week.best.currency_pair}</Text>
                </>
              ) : (
                <Text style={styles.tradeVal}>—</Text>
              )}
            </View>
            <View style={styles.tradeCard}>
              <Text style={styles.kpiLabel}>{t('weeklyReport.worstTrade')}</Text>
              {week.worst && week.worst.pnl !== null ? (
                <>
                  <Text style={[styles.tradeVal, { color: c.loss }]}>{fmt(week.worst.pnl)}</Text>
                  <Text style={styles.tradePair}>{week.worst.currency_pair}</Text>
                </>
              ) : (
                <Text style={styles.tradeVal}>—</Text>
              )}
            </View>
          </View>

          {/* インサイト */}
          {insights.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('weeklyReport.insightsTitle')}</Text>
              <View style={styles.insightCard}>
                {insights.map((ins, i) => (
                  <View key={i} style={styles.insightRow}>
                    <Ionicons name={ins.icon} size={18} color={ins.color} />
                    <Text style={styles.insightText}>{ins.text}</Text>
                  </View>
                ))}
              </View>
            </>
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
    body: { padding: 16, paddingBottom: 48 },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
    },
    heroLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroValue: {
      fontSize: 38,
      fontWeight: '800',
      letterSpacing: -1,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    heroDelta: { fontSize: 13, color: c.textSecondary, marginTop: 6 },
    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    kpiCard: { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 14 },
    kpiLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    kpiValue: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    tradeCard: { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 14 },
    tradeVal: { fontSize: 18, fontWeight: '800', color: c.textPrimary, fontVariant: ['tabular-nums'] },
    tradePair: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontWeight: '600' },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 12,
      marginBottom: 10,
    },
    insightCard: { backgroundColor: c.surface, borderRadius: 12, padding: 4 },
    insightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    insightText: { flex: 1, fontSize: 14, color: c.textPrimary, lineHeight: 20 },
  });
}
