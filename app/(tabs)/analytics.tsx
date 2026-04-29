import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { getPlan } from '@/lib/premium';
import { Trade } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { trades, loading, error, refresh, deleteTrade } = useTrades();
  const { profile } = useProfile();
  const isPremium = getPlan(profile?.is_premium) === 'premium';
  const [refreshing, setRefreshing] = useState(false);

  // 月選択 (offset=0 が今月、-1 で先月)
  const [monthOffset, setMonthOffset] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDelete = (trade: Trade) => {
    const directionLabel = trade.direction === 'long' ? 'ロング' : 'ショート';
    Alert.alert(
      '取引を削除しますか？',
      `${trade.currency_pair} - ${directionLabel}\nこの操作は元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrade(trade.id);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert('削除失敗', msg);
            }
          },
        },
      ],
    );
  };

  const monthInfo = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const monthlyTrades = useMemo(
    () =>
      trades.filter((t) => {
        const d = new Date(t.traded_at);
        return d >= monthInfo.start && d < monthInfo.end;
      }),
    [trades, monthInfo],
  );

  const stats = useMemo(
    () => computeStats(monthlyTrades, c),
    [monthlyTrades, c],
  );

  const dailyData = useMemo(
    () => buildDailyPnl(monthlyTrades, monthInfo),
    [monthlyTrades, monthInfo],
  );

  const pairData = useMemo(() => buildPairPnl(monthlyTrades), [monthlyTrades]);

  const winLossData = useMemo(
    () => buildWinLossDistribution(monthlyTrades, c),
    [monthlyTrades, c],
  );

  const chartConfig = useMemo(
    () => ({
      backgroundColor: c.surface,
      backgroundGradientFrom: c.surface,
      backgroundGradientTo: c.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => withOpacity(c.accent, opacity),
      labelColor: (opacity = 1) => withOpacity(c.textSecondary, opacity),
      propsForBackgroundLines: { stroke: c.border },
      propsForLabels: { fontSize: 10 },
      barPercentage: 0.7,
    }),
    [c],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>あなたのトレード成績</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>エラー: {error}</Text>
            </View>
          )}

          <View style={styles.monthRow}>
            <Pressable
              hitSlop={8}
              onPress={() => setMonthOffset((n) => n - 1)}
              style={styles.monthArrow}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={c.textPrimary}
              />
            </Pressable>
            <Text style={styles.monthLabel}>{monthInfo.label}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => setMonthOffset((n) => Math.min(0, n + 1))}
              disabled={monthOffset >= 0}
              style={[
                styles.monthArrow,
                monthOffset >= 0 && styles.monthArrowDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={c.textPrimary}
              />
            </Pressable>
          </View>

          {monthOffset === 0 && profile?.monthly_pnl_goal != null && (
            <GoalProgress
              goal={profile.monthly_pnl_goal}
              actual={
                monthlyTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
              }
            />
          )}

          <Text style={styles.sectionLabel}>KPI</Text>

          <View style={styles.kpiGrid}>
            <KpiCard label="月間P&L" value={stats.pnlDisplay} valueStyle={stats.pnlStyle} />
            <KpiCard label="勝率" value={stats.winRateDisplay} />
            <KpiCard label="取引回数" value={`${stats.tradeCount}回`} />
            <KpiCard label="平均P&L" value={stats.avgPnlDisplay} valueStyle={stats.avgPnlStyle} />
            <KpiCard label="RR比" value={stats.rrDisplay} />
            <KpiCard label="平均pips" value={stats.avgPipsDisplay} valueStyle={stats.avgPipsStyle} />
          </View>

          {monthlyTrades.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                カレンダー
              </Text>
              <View style={styles.chartCard}>
                <CalendarView
                  trades={monthlyTrades}
                  monthInfo={monthInfo}
                />
              </View>

              <View style={styles.lockedWrap}>
                <View pointerEvents={isPremium ? 'auto' : 'none'}>
                  <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                    日別P&L推移
                  </Text>
                  <View style={styles.chartCard}>
                    <BarChart
                      data={dailyData}
                      width={SCREEN_WIDTH - 64}
                      height={200}
                      chartConfig={chartConfig}
                      fromZero
                      showValuesOnTopOfBars={false}
                      yAxisLabel=""
                      yAxisSuffix=""
                      withInnerLines
                      style={styles.chart}
                    />
                  </View>

                  {pairData.labels.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                        通貨ペア別損益
                      </Text>
                      <View style={styles.chartCard}>
                        <BarChart
                          data={pairData}
                          width={SCREEN_WIDTH - 64}
                          height={Math.max(200, pairData.labels.length * 36)}
                          chartConfig={chartConfig}
                          fromZero
                          yAxisLabel=""
                          yAxisSuffix=""
                          verticalLabelRotation={30}
                          style={styles.chart}
                        />
                      </View>
                    </>
                  )}

                  {winLossData.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                        勝敗比率
                      </Text>
                      <View style={styles.chartCard}>
                        <PieChart
                          data={winLossData}
                          width={SCREEN_WIDTH - 64}
                          height={180}
                          chartConfig={chartConfig}
                          accessor="population"
                          backgroundColor="transparent"
                          paddingLeft="0"
                          hasLegend
                        />
                      </View>
                    </>
                  )}

                  <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                    時間帯別パフォーマンス
                  </Text>
                  <View style={styles.chartCard}>
                    <HourlyHeatmap trades={monthlyTrades} />
                  </View>

                  <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                    曜日別パフォーマンス
                  </Text>
                  <View style={styles.chartCard}>
                    <WeekdayPerf trades={monthlyTrades} />
                  </View>
                </View>

                {!isPremium && (
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 22 : 40}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.lockedBlur}
                  >
                    <View
                      style={[
                        styles.lockedTint,
                        {
                          backgroundColor: isDark
                            ? 'rgba(0,0,0,0.35)'
                            : 'rgba(255,255,255,0.35)',
                        },
                      ]}
                    />
                    <View style={styles.lockedCtaWrap}>
                      <View style={styles.lockedIcon}>
                        <Ionicons name="lock-closed" size={28} color="#fff" />
                      </View>
                      <Text style={styles.lockedTitle}>
                        {t('premiumLock.title')}
                      </Text>
                      <Text style={styles.lockedBody}>
                        {t('premiumLock.body')}
                      </Text>
                      <Link href="/premium" asChild>
                        <Pressable
                          style={({ pressed }) => [
                            styles.lockedCta,
                            pressed && styles.lockedCtaPressed,
                          ]}
                          hitSlop={6}
                        >
                          <Text style={styles.lockedCtaText}>
                            {t('premiumLock.cta')}
                          </Text>
                        </Pressable>
                      </Link>
                    </View>
                  </BlurView>
                )}
              </View>
            </>
          ) : (
            <View style={[styles.emptyBox, styles.sectionLabelMt]}>
              <Text style={styles.emptyText}>
                この月の取引はまだありません。
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
            直近の取引
          </Text>

          {monthlyTrades.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>取引がありません</Text>
            </View>
          ) : (
            monthlyTrades.slice(0, 20).map((trade) => (
              <TradeRow key={trade.id} trade={trade} onDelete={handleDelete} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function GoalProgress({
  goal,
  actual,
}: {
  goal: number;
  actual: number;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const pct = goal > 0 ? Math.max(0, Math.min(100, (actual / goal) * 100)) : 0;
  const achieved = actual >= goal;
  const positive = actual >= 0;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHead}>
        <Text style={styles.goalTitle}>月間目標</Text>
        <Text style={styles.goalPct}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.goalBarBg}>
        <View
          style={[
            styles.goalBar,
            {
              width: `${Math.max(2, pct)}%`,
              backgroundColor: achieved ? c.win : positive ? c.accent : c.loss,
            },
          ]}
        />
      </View>
      <View style={styles.goalRow}>
        <Text style={styles.goalSub}>
          現在: {Math.round(actual).toLocaleString('ja-JP')}円
        </Text>
        <Text style={styles.goalSub}>
          目標: {Math.round(goal).toLocaleString('ja-JP')}円
        </Text>
      </View>
    </View>
  );
}

function HourlyHeatmap({ trades }: { trades: Trade[] }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const hourly = useMemo(() => {
    const map = new Map<number, { pnl: number; count: number }>();
    for (const t of trades) {
      const h = new Date(t.traded_at).getHours();
      const cur = map.get(h) ?? { pnl: 0, count: 0 };
      cur.pnl += t.pnl ?? 0;
      cur.count += 1;
      map.set(h, cur);
    }
    return map;
  }, [trades]);

  const maxAbs = Math.max(
    1,
    ...Array.from(hourly.values()).map((v) => Math.abs(v.pnl)),
  );

  return (
    <View style={styles.heatmapWrap}>
      {Array.from({ length: 24 }).map((_, h) => {
        const v = hourly.get(h);
        const intensity = v ? Math.min(1, Math.abs(v.pnl) / maxAbs) : 0;
        const bg = !v
          ? c.surfaceAlt
          : v.pnl > 0
            ? withOpacity(c.win, 0.3 + intensity * 0.7)
            : v.pnl < 0
              ? withOpacity(c.loss, 0.3 + intensity * 0.7)
              : c.surfaceAlt;
        return (
          <View key={h} style={[styles.heatmapCell, { backgroundColor: bg }]}>
            <Text style={styles.heatmapHour}>{h}</Text>
            {v && (
              <Text
                style={[
                  styles.heatmapVal,
                  v.pnl !== 0 && { color: '#fff' },
                ]}
                numberOfLines={1}
              >
                {v.count}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function WeekdayPerf({ trades }: { trades: Trade[] }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const labels = ['日', '月', '火', '水', '木', '金', '土'];

  const weekly = useMemo(() => {
    const arr = labels.map(() => ({ pnl: 0, count: 0, win: 0, loss: 0 }));
    for (const t of trades) {
      const w = new Date(t.traded_at).getDay();
      arr[w].pnl += t.pnl ?? 0;
      arr[w].count += 1;
      if (t.result === 'win') arr[w].win += 1;
      if (t.result === 'loss') arr[w].loss += 1;
    }
    return arr;
  }, [trades, labels]);

  return (
    <View style={styles.weekdayWrap}>
      {weekly.map((v, i) => {
        const winRate =
          v.win + v.loss > 0
            ? Math.round((v.win / (v.win + v.loss)) * 100)
            : null;
        return (
          <View key={labels[i]} style={styles.weekdayRow}>
            <Text
              style={[
                styles.weekdayLabel,
                i === 0 && { color: c.loss },
                i === 6 && { color: c.verified },
              ]}
            >
              {labels[i]}
            </Text>
            <View style={styles.weekdayStats}>
              <Text style={[styles.weekdayPnl, pnlColor(v.pnl, c)]}>
                {v.count > 0 ? formatPnl(v.pnl) : '—'}
              </Text>
              <Text style={styles.weekdaySub}>
                {v.count}回{winRate !== null ? ` · 勝率${winRate}%` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CalendarView({
  trades,
  monthInfo,
}: {
  trades: Trade[];
  monthInfo: MonthRange;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  // 日別 PnL 集計
  const dayPnl = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of trades) {
      if (t.pnl === null) continue;
      const d = new Date(t.traded_at);
      const day = d.getDate();
      m.set(day, (m.get(day) ?? 0) + t.pnl);
    }
    return m;
  }, [trades]);

  const lastDay = new Date(
    monthInfo.end.getTime() - 24 * 60 * 60 * 1000,
  ).getDate();
  const firstDay = monthInfo.start.getDay(); // 0=日曜

  // セルを縦並びの行に分割（7列）
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <View style={styles.calendarWrap}>
      <View style={styles.calendarWeek}>
        {weekLabels.map((w, i) => (
          <View key={w} style={styles.calendarHeadCell}>
            <Text
              style={[
                styles.calendarHead,
                i === 0 && { color: c.loss },
                i === 6 && { color: c.verified },
              ]}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calendarRow}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={ci} style={styles.calendarCell} />;
            }
            const pnl = dayPnl.get(day);
            const hasPnl = pnl !== undefined;
            const positive = hasPnl && pnl > 0;
            const negative = hasPnl && pnl < 0;
            return (
              <View
                key={ci}
                style={[
                  styles.calendarCell,
                  positive && styles.calendarCellWin,
                  negative && styles.calendarCellLoss,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayNum,
                    (positive || negative) && { color: '#fff' },
                  ]}
                >
                  {day}
                </Text>
                {hasPnl && (
                  <Text
                    style={[
                      styles.calendarDayPnl,
                      (positive || negative) && { color: '#fff' },
                    ]}
                    numberOfLines={1}
                  >
                    {formatCompactPnl(pnl)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function formatCompactPnl(n: number): string {
  const abs = Math.abs(n);
  let str: string;
  if (abs >= 10000) {
    str = `${(n / 10000).toFixed(1)}万`;
  } else if (abs >= 1000) {
    str = `${(n / 1000).toFixed(1)}k`;
  } else {
    str = String(Math.round(n));
  }
  return n > 0 ? `+${str}` : str;
}

function KpiCard({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: TextStyle;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function TradeRow({
  trade,
  onDelete,
}: {
  trade: Trade;
  onDelete: (trade: Trade) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const directionLabel = trade.direction === 'long' ? 'ロング' : 'ショート';
  const resultLabel =
    trade.result === 'win' ? '利確' : trade.result === 'loss' ? '損切り' : null;
  const date = new Date(trade.traded_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeRowTop}>
        <Text style={styles.tradePair}>{trade.currency_pair}</Text>
        <Text style={styles.tradeDirection}>{directionLabel}</Text>
        {resultLabel && (
          <View
            style={[
              styles.resultBadge,
              trade.result === 'win'
                ? styles.resultBadgeWin
                : styles.resultBadgeLoss,
            ]}
          >
            <Text style={styles.resultBadgeText}>{resultLabel}</Text>
          </View>
        )}
        <Text style={styles.tradeDate}>{dateStr}</Text>
        <Pressable
          onPress={() => onDelete(trade)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
        >
          <Ionicons name="close" size={18} color={c.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.tradeRowMid}>
        <Text style={[styles.tradePnl, pnlColor(trade.pnl, c)]}>
          {trade.pnl !== null ? formatPnl(trade.pnl) : '—'}
        </Text>
        {trade.pnl_pips !== null && (
          <Text style={[styles.tradePips, pnlColor(trade.pnl_pips, c)]}>
            {formatPips(trade.pnl_pips)}
          </Text>
        )}
      </View>
    </View>
  );
}

type Stats = {
  tradeCount: number;
  pnlDisplay: string;
  pnlStyle?: TextStyle;
  avgPnlDisplay: string;
  avgPnlStyle?: TextStyle;
  winRateDisplay: string;
  rrDisplay: string;
  avgPipsDisplay: string;
  avgPipsStyle?: TextStyle;
};

function computeStats(monthly: Trade[], c: ThemeColors): Stats {
  const withPnl = monthly.filter((t) => t.pnl !== null);
  const totalPnl = withPnl.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgPnl = withPnl.length > 0 ? totalPnl / withPnl.length : null;

  const withResult = monthly.filter((t) => t.result !== null);
  const winCount = withResult.filter((t) => t.result === 'win').length;
  const winRate =
    withResult.length > 0
      ? Math.round((winCount / withResult.length) * 100)
      : null;

  const wins = withPnl.filter((t) => (t.pnl ?? 0) > 0);
  const losses = withPnl.filter((t) => (t.pnl ?? 0) < 0);
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length
      : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

  const withPips = monthly.filter((t) => t.pnl_pips !== null);
  const avgPips =
    withPips.length > 0
      ? withPips.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0) / withPips.length
      : null;

  return {
    tradeCount: monthly.length,
    pnlDisplay: withPnl.length === 0 ? '—' : formatPnl(totalPnl),
    pnlStyle: withPnl.length === 0 ? undefined : pnlColor(totalPnl, c),
    avgPnlDisplay: avgPnl === null ? '—' : formatPnl(avgPnl),
    avgPnlStyle: avgPnl === null ? undefined : pnlColor(avgPnl, c),
    winRateDisplay: winRate === null ? '—' : `${winRate}%`,
    rrDisplay: rr === null ? '—' : rr.toFixed(2),
    avgPipsDisplay: avgPips === null ? '—' : formatPips(avgPips),
    avgPipsStyle: avgPips === null ? undefined : pnlColor(avgPips, c),
  };
}

type MonthRange = {
  start: Date;
  end: Date;
  label: string;
};

function getMonthRange(offset: number): MonthRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const label = `${start.getFullYear()}年${start.getMonth() + 1}月`;
  return { start, end, label };
}

function buildDailyPnl(monthly: Trade[], range: MonthRange) {
  // 日別 PnL 合計（最大30日）
  const dayPnl = new Map<number, number>();
  for (const t of monthly) {
    if (t.pnl === null) continue;
    const d = new Date(t.traded_at);
    const day = d.getDate();
    dayPnl.set(day, (dayPnl.get(day) ?? 0) + t.pnl);
  }

  const lastDay = new Date(
    range.end.getTime() - 24 * 60 * 60 * 1000,
  ).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  const labels = days.map((d) => (d % 5 === 0 || d === 1 ? String(d) : ''));
  const data = days.map((d) => dayPnl.get(d) ?? 0);

  return {
    labels,
    datasets: [{ data: data.length === 0 ? [0] : data }],
  };
}

function buildPairPnl(monthly: Trade[]) {
  const pairPnl = new Map<string, number>();
  for (const t of monthly) {
    if (t.pnl === null) continue;
    pairPnl.set(t.currency_pair, (pairPnl.get(t.currency_pair) ?? 0) + t.pnl);
  }
  const sorted = Array.from(pairPnl.entries()).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );
  const top = sorted.slice(0, 8);
  return {
    labels: top.map(([pair]) => pair),
    datasets: [{ data: top.length === 0 ? [0] : top.map(([, v]) => v) }],
  };
}

function buildWinLossDistribution(monthly: Trade[], c: ThemeColors) {
  let wins = 0;
  let losses = 0;
  let neutral = 0;
  for (const t of monthly) {
    if (t.result === 'win') wins++;
    else if (t.result === 'loss') losses++;
    else neutral++;
  }
  const total = wins + losses + neutral;
  if (total === 0) return [];
  const result: {
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }[] = [];
  if (wins > 0) {
    result.push({
      name: '勝ち',
      population: wins,
      color: c.win,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  if (losses > 0) {
    result.push({
      name: '負け',
      population: losses,
      color: c.loss,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  if (neutral > 0) {
    result.push({
      name: '未設定',
      population: neutral,
      color: c.textSecondary,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  return result;
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} pips`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function withOpacity(hex: string, opacity: number): string {
  // hex のような #RRGGBB を rgba にする
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    sectionLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionLabelMt: { marginTop: 28 },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    monthArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    monthArrowDisabled: { opacity: 0.4 },
    monthArrowText: { fontSize: 18, color: c.textPrimary, fontWeight: '700' },
    monthLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    goalCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    goalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    goalTitle: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    goalPct: { fontSize: 18, fontWeight: '800', color: c.accent },
    goalBarBg: {
      height: 8,
      backgroundColor: c.surfaceAlt,
      borderRadius: 4,
      overflow: 'hidden',
    },
    goalBar: {
      height: '100%',
      borderRadius: 4,
    },
    goalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    goalSub: { fontSize: 11, color: c.textSecondary },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kpiCard: {
      width: '32%',
      flexGrow: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    kpiLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4 },
    kpiValue: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    chart: { borderRadius: 8 },
    heatmapWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
      width: '100%',
    },
    heatmapCell: {
      width: '12%',
      aspectRatio: 1,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    heatmapHour: {
      fontSize: 9,
      fontWeight: '600',
      color: c.textPrimary,
    },
    heatmapVal: {
      fontSize: 9,
      color: c.textSecondary,
      fontWeight: '500',
    },
    weekdayWrap: {
      width: '100%',
      gap: 6,
    },
    weekdayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    weekdayLabel: {
      width: 30,
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    weekdayStats: {
      flex: 1,
      alignItems: 'flex-end',
    },
    weekdayPnl: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    weekdaySub: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    calendarWrap: { width: '100%' },
    calendarWeek: { flexDirection: 'row', marginBottom: 4 },
    calendarHeadCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    calendarHead: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
    calendarRow: { flexDirection: 'row', gap: 2, marginBottom: 2 },
    calendarCell: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    calendarCellWin: { backgroundColor: c.win },
    calendarCellLoss: { backgroundColor: c.loss },
    calendarDayNum: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textPrimary,
    },
    calendarDayPnl: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 1,
    },
    errorBox: {
      backgroundColor: '#7F1D1D',
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    errorText: { color: '#FECACA', fontSize: 13 },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
    },
    emptyText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    lockedWrap: {
      position: 'relative',
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
    },
    lockedBlur: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 60,
    },
    lockedTint: {
      ...StyleSheet.absoluteFillObject,
    },
    lockedCtaWrap: {
      alignItems: 'center',
      paddingHorizontal: 28,
      gap: 10,
    },
    lockedIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    lockedTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    lockedBody: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 320,
    },
    lockedCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.accent,
      paddingHorizontal: 22,
      paddingVertical: 13,
      borderRadius: 999,
      marginTop: 10,
      shadowColor: c.accent,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    lockedCtaPressed: {
      opacity: 0.85,
    },
    lockedCtaText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '700',
    },
    tradeRow: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    tradeRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    tradePair: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    tradeDirection: { fontSize: 13, color: c.textSecondary },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    resultBadgeWin: { backgroundColor: c.win },
    resultBadgeLoss: { backgroundColor: c.loss },
    resultBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    tradeDate: {
      marginLeft: 'auto',
      fontSize: 11,
      color: c.textSecondary,
    },
    deleteButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    deleteButtonPressed: { backgroundColor: c.border },
    deleteButtonText: {
      fontSize: 18,
      color: c.textSecondary,
      fontWeight: '500',
      lineHeight: 18,
    },
    tradeRowMid: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
    tradePnl: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
    tradePips: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
  });
}
