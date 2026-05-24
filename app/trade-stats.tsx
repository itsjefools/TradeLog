import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { EmptyState } from '@/components/empty-state';
import { PremiumGate } from '@/components/premium-gate';
import { PremiumTag } from '@/components/premium-tag';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { StatsPeriod, TradeStats, useTradeStats } from '@/hooks/use-trade-stats';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { selectionFeedback } from '@/lib/haptics';
import { PRESET_TRADE_TAGS } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PERIODS: StatsPeriod[] = ['1d', '1w', '1m', '3m', '6m', '1y', 'all'];

// プリセットタグは翻訳ラベルに、カスタムタグはそのまま表示
function tagLabel(tag: string, t: (k: string) => string): string {
  return PRESET_TRADE_TAGS.includes(tag as never) ? t(`tags.${tag}`) : tag;
}

export default function TradeStatsScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const { stats } = useTradeStats(period);

  const fmt = (n: number) => formatPnlWithCurrency(n, currency);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
          <PremiumTag />
        </View>
        <Pressable
          onPress={() => router.push('/ai-review')}
          hitSlop={12}
          accessibilityLabel={t('aiReview.title')}
        >
          <Ionicons name="sparkles-outline" size={22} color={c.accent} />
        </Pressable>
      </View>

      <PremiumGate feature="stats">
      <ScrollView contentContainerStyle={styles.body}>
        {/* 期間フィルター */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  selectionFeedback();
                  setPeriod(p);
                }}
                style={[
                  styles.periodChip,
                  { backgroundColor: active ? c.accent : c.surfaceAlt },
                ]}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    { color: active ? '#fff' : c.textSecondary },
                  ]}
                >
                  {t(`stats.period_${p}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {stats.totalTrades === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            title={t('empty.stats_title')}
            subtitle={t('empty.stats_subtitle')}
          />
        ) : (
          <>
            {/* メインKPI */}
            <View style={styles.cardRow}>
              <StatCard
                label={t('stats.total_pnl')}
                value={fmt(stats.totalPnl)}
                color={stats.totalPnl >= 0 ? c.win : c.loss}
              />
              <StatCard
                label={t('stats.win_rate')}
                value={`${stats.winRate.toFixed(1)}%`}
                sub={`${stats.totalTrades} ${t('stats.trades')}`}
              />
            </View>
            <View style={styles.cardRow}>
              <StatCard
                label={t('stats.profit_factor')}
                value={
                  stats.profitFactor === Infinity
                    ? '∞'
                    : stats.profitFactor.toFixed(2)
                }
              />
              <StatCard
                label={t('stats.avg_pnl')}
                value={fmt(Math.round(stats.avgPnl))}
                color={stats.avgPnl >= 0 ? c.win : c.loss}
              />
            </View>

            {/* インサイト（自動の気づき） */}
            <StatsInsights stats={stats} t={t} c={c} fmt={fmt} />

            {/* 損益カーブ */}
            <Text style={styles.sectionLabel}>{t('stats.pnl_curve')}</Text>
            <View style={styles.chartCard}>
              <PnlCurve curve={stats.pnlCurve} isDark={isDark} c={c} />
            </View>

            {/* 詳細統計 */}
            <Text style={styles.sectionLabel}>{t('stats.details')}</Text>
            <View style={styles.cardRow}>
              <StatCard
                label={t('stats.avg_win')}
                value={fmt(Math.round(stats.avgWin))}
                color={c.win}
              />
              <StatCard
                label={t('stats.avg_loss')}
                value={fmt(-Math.round(stats.avgLoss))}
                color={c.loss}
              />
            </View>
            <View style={styles.cardRow}>
              <StatCard
                label={t('stats.max_win')}
                value={fmt(stats.maxWin)}
                color={c.win}
              />
              <StatCard
                label={t('stats.max_loss')}
                value={fmt(stats.maxLoss)}
                color={c.loss}
              />
            </View>
            <View style={styles.cardRow}>
              <StatCard
                label={t('stats.win_streak')}
                value={`${stats.winStreak}`}
              />
              <StatCard
                label={t('stats.lose_streak')}
                value={`${stats.loseStreak}`}
              />
            </View>

            {/* 通貨ペア別 */}
            <Text style={styles.sectionLabel}>{t('stats.by_pair')}</Text>
            <View style={styles.pairCard}>
              {stats.byPair.map((p, i) => (
                <View
                  key={p.pair}
                  style={[
                    styles.pairRow,
                    i < stats.byPair.length - 1 && styles.pairRowBorder,
                  ]}
                >
                  <Text style={styles.pairName}>{p.pair}</Text>
                  <Text style={styles.pairTrades}>
                    {p.trades} {t('stats.trades')}
                  </Text>
                  <Text style={styles.pairWinRate}>
                    {p.winRate.toFixed(0)}%
                  </Text>
                  <Text
                    style={[
                      styles.pairPnl,
                      { color: p.pnl >= 0 ? c.win : c.loss },
                    ]}
                  >
                    {fmt(Math.round(p.pnl))}
                  </Text>
                </View>
              ))}
            </View>

            {/* タグ別（手法別）— タグ付き取引がある場合のみ表示 */}
            {stats.byTag.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('stats.by_tag')}</Text>
                <View style={styles.pairCard}>
                  {stats.byTag.map((tg, i) => (
                    <View
                      key={tg.tag}
                      style={[
                        styles.pairRow,
                        i < stats.byTag.length - 1 && styles.pairRowBorder,
                      ]}
                    >
                      <Text style={styles.pairName} numberOfLines={1}>
                        {tagLabel(tg.tag, t)}
                      </Text>
                      <Text style={styles.pairTrades}>
                        {tg.trades} {t('stats.trades')}
                      </Text>
                      <Text style={styles.pairWinRate}>
                        {tg.winRate.toFixed(0)}%
                      </Text>
                      <Text
                        style={[
                          styles.pairPnl,
                          { color: tg.pnl >= 0 ? c.win : c.loss },
                        ]}
                      >
                        {fmt(Math.round(tg.pnl))}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      </PremiumGate>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function PnlCurve({
  curve,
  isDark,
  c,
}: {
  curve: { date: string; cumulative: number }[];
  isDark: boolean;
  c: ThemeColors;
}) {
  if (curve.length < 2) {
    return (
      <Text style={{ color: c.textSecondary, fontSize: 13, paddingVertical: 24 }}>
        —
      </Text>
    );
  }

  const W = SCREEN_WIDTH - 40;
  const H = 170;
  const pad = { top: 12, bottom: 20, left: 8, right: 8 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = curve.map((p) => p.cumulative);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const range = maxVal - minVal || 1;

  const points = curve.map((p, i) => {
    const x = pad.left + (i / (curve.length - 1)) * chartW;
    const y = pad.top + chartH - ((p.cumulative - minVal) / range) * chartH;
    return { x, y };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const last = curve[curve.length - 1].cumulative;
  const lineColor = last >= 0 ? c.win : c.loss;
  const zeroY = pad.top + chartH - ((0 - minVal) / range) * chartH;
  const lastPoint = points[points.length - 1];

  return (
    <Svg width={W} height={H}>
      <Line
        x1={pad.left}
        y1={zeroY}
        x2={W - pad.right}
        y2={zeroY}
        stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={lineColor} />
    </Svg>
  );
}

// 自動インサイト（プレミアムの付加価値: 数字から「気づき」を言語化）
function StatsInsights({
  stats,
  t,
  c,
  fmt,
}: {
  stats: TradeStats;
  t: (k: string, p?: Record<string, unknown>) => string;
  c: ThemeColors;
  fmt: (n: number) => string;
}) {
  const lines: { icon: string; text: string }[] = [];

  if (stats.byPair.length > 0) {
    const best = [...stats.byPair].sort((a, b) => b.pnl - a.pnl)[0];
    if (best && best.pnl > 0) {
      lines.push({
        icon: '💪',
        text: t('stats.insight_strong_pair', {
          pair: best.pair,
          pnl: fmt(Math.round(best.pnl)),
        }),
      });
    }
  }
  if (stats.profitFactor !== 0 && stats.profitFactor !== Infinity) {
    if (stats.profitFactor >= 1.5) {
      lines.push({
        icon: '✅',
        text: t('stats.insight_pf_good', { pf: stats.profitFactor.toFixed(2) }),
      });
    } else if (stats.profitFactor < 1) {
      lines.push({
        icon: '⚠️',
        text: t('stats.insight_pf_watch', { pf: stats.profitFactor.toFixed(2) }),
      });
    }
  }
  if (stats.winStreak >= 3) {
    lines.push({
      icon: '🔥',
      text: t('stats.insight_streak', { count: stats.winStreak }),
    });
  }

  if (lines.length === 0) return null;

  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: c.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 10,
        }}
      >
        {t('stats.insights_title')}
      </Text>
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        }}
      >
        {lines.map((l, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
          >
            <Text style={{ fontSize: 16 }}>{l.icon}</Text>
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: c.textPrimary,
                lineHeight: 20,
              }}
            >
              {l.text}
            </Text>
          </View>
        ))}
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
    headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 26 },
    body: { padding: 20, paddingBottom: 60 },
    periodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    periodChip: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
    },
    periodChipText: { fontSize: 13, fontWeight: '700' },
    cardRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
    },
    statLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statSub: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
    sectionLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 10,
    },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
    },
    pairCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    pairRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    pairRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    pairName: {
      width: 88,
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    pairTrades: { flex: 1, fontSize: 12, color: c.textSecondary },
    pairWinRate: { fontSize: 12, color: c.textSecondary, marginRight: 12 },
    pairPnl: {
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
}
