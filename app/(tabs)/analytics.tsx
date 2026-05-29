import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useScrollToTop } from '@react-navigation/native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  UIManager,
  View,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { PremiumTag } from '@/components/premium-tag';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { formatPips } from '@/lib/format-pips';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { getPlan } from '@/lib/premium';
import { formatDate, pickerLocale } from '@/lib/format-date';
import { Trade } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { trades, loading, error, refresh, deleteTrade } = useTrades();
  const { profile } = useProfile();
  const router = useRouter();
  const isPremium = getPlan(profile?.is_premium, profile?.bonus_premium_until) === 'premium';
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // 月選択 (offset=0 が今月、-1 で先月)
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const selectDay = useCallback((day: number | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDay(day);
  }, []);

  // 月が変わったら選択をリセット
  useEffect(() => {
    setSelectedDay(null);
  }, [monthOffset]);

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
    const directionLabel = trade.direction === 'long' ? t('common.long') : t('common.short');
    Alert.alert(
      t('analytics.confirmDeleteTitle'),
      `${trade.currency_pair} - ${directionLabel}\n${t('analytics.confirmDeleteBody')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrade(trade.id);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert(t('analytics.deleteFail'), msg);
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
    () => computeStats(monthlyTrades, c, profile?.currency),
    [monthlyTrades, c, profile?.currency],
  );

  const dailyData = useMemo(
    () => buildDailyPnl(monthlyTrades, monthInfo),
    [monthlyTrades, monthInfo],
  );


  const pairData = useMemo(() => buildPairPnl(monthlyTrades), [monthlyTrades]);

  const winLossData = useMemo(
    () =>
      buildWinLossDistribution(monthlyTrades, c, {
        win: t('analytics.winLabel'),
        loss: t('analytics.lossLabel'),
        unset: t('analytics.unsetLabel'),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthlyTrades, c, t],
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
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('analytics.title')}</Text>
          <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/weekly-report')}
            hitSlop={8}
            style={styles.statsButton}
            accessibilityLabel={t('weeklyReport.title')}
          >
            <Ionicons name="document-text-outline" size={20} color={c.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/share-card')}
            hitSlop={8}
            style={styles.statsButton}
          >
            <Ionicons name="share-social-outline" size={20} color={c.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/trade-stats')}
            hitSlop={8}
            style={styles.statsButton}
          >
            <Ionicons name="stats-chart" size={20} color={c.textPrimary} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
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
              <Text style={styles.errorText}>{t('analytics.errorPrefix')}{error}</Text>
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
            <Text style={styles.monthLabel}>
              {localizedMonthLabel(monthInfo.start, locale)}
            </Text>
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

          {/* メインKPI: 月間P&L を大きく表示 */}
          <View style={styles.primaryKpi}>
            <Text style={styles.primaryKpiLabel}>{t('analytics.kpiMonthlyPnl')}</Text>
            <Text style={[styles.primaryKpiValue, stats.pnlStyle]}>
              {stats.pnlDisplay}
            </Text>
          </View>

          {/* サブKPI: テーブル形式 */}
          <View style={styles.secondaryKpiList}>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('analytics.winRate')}</Text>
              <Text style={styles.kpiRowValue}>{stats.winRateDisplay}</Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('analytics.tradeCount')}</Text>
              <Text style={styles.kpiRowValue}>{stats.tradeCount}{t('analytics.tradeCountUnit')}</Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('analytics.avgPnl')}</Text>
              <Text style={[styles.kpiRowValue, stats.avgPnlStyle]}>
                {stats.avgPnlDisplay}
              </Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('analytics.rrRatio')}</Text>
              <Text style={styles.kpiRowValue}>{stats.rrDisplay}</Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('analytics.avgPips')}</Text>
              <Text style={[styles.kpiRowValue, stats.avgPipsStyle]}>
                {stats.avgPipsDisplay}
              </Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('stats.profit_factor')}</Text>
              <Text style={styles.kpiRowValue}>{stats.pfDisplay}</Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('stats.max_win')}</Text>
              <Text style={[styles.kpiRowValue, stats.bestStyle]}>
                {stats.bestDisplay}
              </Text>
            </View>
            <View style={styles.kpiRow}>
              <Text style={styles.kpiRowLabel}>{t('stats.max_loss')}</Text>
              <Text style={[styles.kpiRowValue, stats.worstStyle]}>
                {stats.worstDisplay}
              </Text>
            </View>
          </View>

          {monthlyTrades.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                {t('analytics.calendar')}
              </Text>
              <View style={styles.chartCard}>
                <CalendarView
                  trades={monthlyTrades}
                  monthInfo={monthInfo}
                  selectedDay={selectedDay}
                  onSelectDay={selectDay}
                />
              </View>

              {selectedDay !== null && (
                <DayDetail
                  year={monthInfo.start.getFullYear()}
                  month={monthInfo.start.getMonth() + 1}
                  day={selectedDay}
                  trades={monthlyTrades.filter(
                    (t) => new Date(t.traded_at).getDate() === selectedDay,
                  )}
                  onTradePress={(trade) =>
                    router.push(`/trade/${trade.id}`)
                  }
                  onRecordPress={() => {
                    const d = new Date(
                      monthInfo.start.getFullYear(),
                      monthInfo.start.getMonth(),
                      selectedDay,
                      12, // 正午で固定（タイムゾーンずれ防止）
                      0,
                      0,
                    );
                    router.push(
                      `/(tabs)/record?date=${encodeURIComponent(d.toISOString())}`,
                    );
                  }}
                  onClose={() => selectDay(null)}
                />
              )}

              <View style={styles.lockedWrap}>
                <View pointerEvents={isPremium ? 'auto' : 'none'}>
                  <View style={styles.premiumSectionHead}>
                    <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                      {t('analytics.dailyPnl')}
                    </Text>
                    <PremiumTag />
                  </View>
                  <View style={styles.dataCard}>
                    <DailyBars data={dailyData} currency={profile?.currency} />
                  </View>

                  {monthOffset === 0 && (
                    <ProjectionCard trades={trades} currency={profile?.currency} />
                  )}

                  <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                    {t('analytics.heatmapTitle')}
                  </Text>
                  <View style={styles.dataCard}>
                    <TradeHeatmap trades={trades} currency={profile?.currency} />
                  </View>

                  {pairData.labels.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                        {t('analytics.pairBreakdown')}
                      </Text>
                      <View style={styles.dataCard}>
                        <PairBars data={pairData} currency={profile?.currency} />
                      </View>
                    </>
                  )}

                  {winLossData.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                        {t('analytics.winLossRatio')}
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
                    {t('analytics.hourlyPerf')}
                  </Text>
                  <View style={styles.chartCard}>
                    <HourlyHeatmap trades={monthlyTrades} />
                  </View>

                  <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
                    {t('analytics.weekdayPerf')}
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
                {t('analytics.noTradesThisMonth')}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
            {t('analytics.recentTrades')}
          </Text>

          {monthlyTrades.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('analytics.noTrades')}</Text>
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
  const { t } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const pct = goal > 0 ? Math.max(0, Math.min(100, (actual / goal) * 100)) : 0;
  const achieved = actual >= goal;
  const positive = actual >= 0;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHead}>
        <Text style={styles.goalTitle}>{t('analytics.monthlyGoal')}</Text>
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
          {t('analytics.current')}: {formatPnlWithCurrency(actual, currency)}
        </Text>
        <Text style={styles.goalSub}>
          {t('analytics.goal')}: {formatPnlWithCurrency(goal, currency)}
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
  const { t } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const labels = [
    t('record.daySun'),
    t('record.dayMon'),
    t('record.dayTue'),
    t('record.dayWed'),
    t('record.dayThu'),
    t('record.dayFri'),
    t('record.daySat'),
  ];

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
                {v.count > 0 ? formatPnl(v.pnl, currency) : '—'}
              </Text>
              <Text style={styles.weekdaySub}>
                {v.count}
                {t('analytics.tradeCountUnit')}
                {winRate !== null
                  ? ` · ${t('analytics.winRate')} ${winRate}%`
                  : ''}
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
  selectedDay,
  onSelectDay,
}: {
  trades: Trade[];
  monthInfo: MonthRange;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
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

  const weekLabels = [
    t('record.daySun'),
    t('record.dayMon'),
    t('record.dayTue'),
    t('record.dayWed'),
    t('record.dayThu'),
    t('record.dayFri'),
    t('record.daySat'),
  ];

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
            const isSelected = selectedDay === day;
            const isSun = ci === 0;
            const isSat = ci === 6;
            const weekendTint =
              !hasPnl && isSun
                ? { backgroundColor: c.loss + '10' }
                : !hasPnl && isSat
                  ? { backgroundColor: c.verified + '10' }
                  : null;
            const weekendNumColor =
              !positive && !negative && isSun
                ? { color: c.loss }
                : !positive && !negative && isSat
                  ? { color: c.verified }
                  : null;
            return (
              <Pressable
                key={ci}
                onPress={() => onSelectDay(isSelected ? null : day)}
                hitSlop={2}
                style={[
                  styles.calendarCell,
                  weekendTint,
                  positive && styles.calendarCellWin,
                  negative && styles.calendarCellLoss,
                  isSelected && styles.calendarCellSelected,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayNum,
                    weekendNumColor,
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
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function DayDetail({
  year,
  month,
  day,
  trades,
  onTradePress,
  onRecordPress,
  onClose,
}: {
  year: number;
  month: number;
  day: number;
  trades: Trade[];
  onTradePress: (trade: Trade) => void;
  onRecordPress: () => void;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);

  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const total = trades
      .filter((t) => t.pnl !== null)
      .reduce((s, t) => s + (t.pnl ?? 0), 0);
    const withResult = trades.filter((t) => t.result !== null);
    const wins = withResult.filter((t) => t.result === 'win').length;
    const winRate =
      withResult.length > 0
        ? Math.round((wins / withResult.length) * 100)
        : null;
    return { count: trades.length, total, winRate };
  }, [trades]);

  return (
    <View style={styles.dayDetailCard}>
      <View style={styles.dayDetailHead}>
        <Text style={styles.dayDetailTitle}>
          {t('analytics.dayDetailTitle', {
            date: formatDate(new Date(year, month - 1, day), locale),
          })}
        </Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={20} color={c.textSecondary} />
        </Pressable>
      </View>

      {stats ? (
        <>
          <View style={styles.dayDetailSummary}>
            <View style={styles.dayDetailSummaryItem}>
              <Text style={styles.dayDetailSummaryLabel}>{t('analytics.tradeCountShort')}</Text>
              <Text style={styles.dayDetailSummaryValue}>{stats.count}{t('analytics.tradeCountUnit')}</Text>
            </View>
            <View style={styles.dayDetailSummaryItem}>
              <Text style={styles.dayDetailSummaryLabel}>{t('analytics.pnlTotal')}</Text>
              <Text
                style={[
                  styles.dayDetailSummaryValue,
                  pnlColor(stats.total, c),
                ]}
              >
                {formatPnl(stats.total, currency)}
              </Text>
            </View>
            {stats.winRate !== null && (
              <View style={styles.dayDetailSummaryItem}>
                <Text style={styles.dayDetailSummaryLabel}>{t('analytics.winRate')}</Text>
                <Text style={styles.dayDetailSummaryValue}>
                  {stats.winRate}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.dayDetailDivider} />

          <View style={{ gap: 8 }}>
            {trades.map((trade) => (
              <Pressable
                key={trade.id}
                onPress={() => onTradePress(trade)}
                style={({ pressed }) => [
                  styles.dayTradeCard,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.dayTradeHead}>
                  <Text style={styles.tradePair}>{trade.currency_pair}</Text>
                  <Text style={styles.tradeDirection}>
                    {trade.direction === 'long' ? t('common.long') : t('common.short')}
                  </Text>
                  {trade.result && (
                    <View
                      style={[
                        styles.resultBadge,
                        trade.result === 'win'
                          ? styles.resultBadgeWin
                          : styles.resultBadgeLoss,
                      ]}
                    >
                      <Text style={styles.resultBadgeText}>
                        {trade.result === 'win' ? t('common.win') : t('common.loss')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.dayTradeNumbers}>
                  <Text style={[styles.tradePnl, pnlColor(trade.pnl, c)]}>
                    {trade.pnl !== null ? formatPnl(trade.pnl, currency) : '—'}
                  </Text>
                  {trade.pnl_pips !== null && (
                    <Text
                      style={[styles.tradePips, pnlColor(trade.pnl_pips, c)]}
                    >
                      {formatPips(trade.pnl_pips)}
                    </Text>
                  )}
                </View>
                {trade.memo && (
                  <Text style={styles.dayTradeMemo} numberOfLines={2}>
                    {trade.memo}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.dayEmptyWrap}>
          <Text style={styles.dayEmptyText}>{t('analytics.noTradesToday')}</Text>
          <Pressable
            onPress={onRecordPress}
            style={({ pressed }) => [
              styles.dayEmptyCta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.dayEmptyCtaText}>{t('analytics.recordTrade')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// 日別 P&L: ゼロ基準線・Y軸目安・グリッド・日付ラベル・タップ数値表示つきバーチャート
function DailyBars({
  data,
  currency,
}: {
  data: { labels: string[]; datasets: { data: number[] }[] };
  currency?: string | null;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const values = data.datasets[0]?.data ?? [];
  const labels = data.labels ?? [];
  const [sel, setSel] = useState<number | null>(null);
  const total = values.reduce((s, v) => s + v, 0);

  const maxV = Math.max(0, ...values);
  const minV = Math.min(0, ...values);
  const range = maxV - minV || 1;
  const H = 150;
  const zeroY = (maxV / range) * H; // 上端からゼロ線までの距離(px)
  const pxPerUnit = H / range;
  const AXIS_W = 46;

  const grid = (top: number, strong?: boolean) => (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        height: strong ? 1 : StyleSheet.hairlineWidth,
        backgroundColor: strong ? c.textSecondary : c.border,
        opacity: strong ? 0.5 : 1,
      }}
    />
  );

  return (
    <View>
      {/* タップ時のキャプション */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24, marginBottom: 6 }}>
        {sel !== null ? (
          <>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>
                {labels[sel] || sel + 1}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: values[sel] >= 0 ? c.win : c.loss,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatPnl(values[sel] ?? 0, currency)}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: '800', color: total >= 0 ? c.win : c.loss, fontVariant: ['tabular-nums'] }}>
              {formatPnl(total, currency)}
            </Text>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.win }} />
              <Text style={{ fontSize: 10, color: c.textSecondary }}>{t('analytics.winLabel')}</Text>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.loss, marginLeft: 8 }} />
              <Text style={{ fontSize: 10, color: c.textSecondary }}>{t('analytics.lossLabel')}</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row' }}>
        {/* Y軸の目安 */}
        <View style={{ width: AXIS_W, height: H, position: 'relative' }}>
          {maxV > 0 ? (
            <Text style={{ position: 'absolute', top: -6, right: 6, fontSize: 10, color: c.textSecondary, fontVariant: ['tabular-nums'] }}>
              {formatCompactPnl(maxV)}
            </Text>
          ) : null}
          <Text style={{ position: 'absolute', top: zeroY - 7, right: 6, fontSize: 10, fontWeight: '700', color: c.textSecondary }}>
            0
          </Text>
          {minV < 0 ? (
            <Text style={{ position: 'absolute', top: H - 8, right: 6, fontSize: 10, color: c.textSecondary, fontVariant: ['tabular-nums'] }}>
              {formatCompactPnl(minV)}
            </Text>
          ) : null}
        </View>

        {/* チャート本体 */}
        <View style={{ flex: 1 }}>
          <View style={{ height: H, position: 'relative' }}>
            {maxV > 0 ? grid(0) : null}
            {grid(zeroY, true)}
            {minV < 0 ? grid(H - StyleSheet.hairlineWidth) : null}
            <View style={{ flexDirection: 'row', height: H, gap: 2 }}>
              {values.map((v, i) => {
                const barH = v === 0 ? 0 : Math.max(2, Math.abs(v) * pxPerUnit);
                const positive = v >= 0;
                const active = sel === i;
                return (
                  <Pressable
                    key={i}
                    style={{ flex: 1, height: H }}
                    onPress={() => setSel(active ? null : i)}
                    hitSlop={2}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: positive ? zeroY - barH : zeroY,
                        height: barH,
                        borderRadius: 2,
                        backgroundColor: positive ? c.win : c.loss,
                        opacity: sel === null || active ? 1 : 0.35,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
          {/* 日付ラベル */}
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
            {labels.map((lb, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: c.textSecondary }}>{lb}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// 通貨ペア別: 損益の絶対値に比例した横棒リスト（洗練版）
function PairBars({
  data,
  currency,
}: {
  data: { labels: string[]; datasets: { data: number[] }[] };
  currency?: string | null;
}) {
  const c = useThemeColors();
  const rows = data.labels.map((label, i) => ({
    label,
    value: data.datasets[0]?.data[i] ?? 0,
  }));
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <View style={{ gap: 14, width: '100%' }}>
      {rows.map((r) => {
        const positive = r.value >= 0;
        const color = positive ? c.win : c.loss;
        return (
          <View key={r.label} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: c.textPrimary }}
              >
                {r.label}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatPnl(r.value, currency)}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: c.surfaceAlt,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.max(3, (Math.abs(r.value) / maxAbs) * 100)}%`,
                  borderRadius: 4,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatCompactPnl(n: number): string {
  const abs = Math.abs(n);
  let str: string;
  // 言語非依存の短縮表記（万→k/M をやめて全言語共通に）
  if (abs >= 1000000) {
    str = `${(n / 1000000).toFixed(1)}M`;
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
  const { t } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const directionLabel = trade.direction === 'long' ? t('common.long') : t('common.short');
  const resultLabel =
    trade.result === 'win' ? t('common.win') : trade.result === 'loss' ? t('common.loss') : null;
  const date = new Date(trade.traded_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeRowTop}>
        <Text style={styles.tradePair}>{trade.currency_pair}</Text>
        <View
          style={[
            styles.dirPill,
            {
              backgroundColor:
                trade.direction === 'long' ? `${c.win}1A` : `${c.loss}1A`,
            },
          ]}
        >
          <Ionicons
            name={trade.direction === 'long' ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={trade.direction === 'long' ? c.win : c.loss}
          />
          <Text
            style={[
              styles.dirPillText,
              { color: trade.direction === 'long' ? c.win : c.loss },
            ]}
          >
            {directionLabel}
          </Text>
        </View>
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
          {trade.pnl !== null ? formatPnl(trade.pnl, currency) : '—'}
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
  pfDisplay: string;
  bestDisplay: string;
  bestStyle?: TextStyle;
  worstDisplay: string;
  worstStyle?: TextStyle;
};

function computeStats(monthly: Trade[], c: ThemeColors, currency: string | null | undefined): Stats {
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

  const totalWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const pf =
    totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : null;
  const best = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl ?? 0)) : null;
  const worst =
    losses.length > 0 ? Math.min(...losses.map((t) => t.pnl ?? 0)) : null;

  const withPips = monthly.filter((t) => t.pnl_pips !== null);
  const avgPips =
    withPips.length > 0
      ? withPips.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0) / withPips.length
      : null;

  return {
    tradeCount: monthly.length,
    pnlDisplay: withPnl.length === 0 ? '—' : formatPnl(totalPnl, currency),
    pnlStyle: withPnl.length === 0 ? undefined : pnlColor(totalPnl, c),
    avgPnlDisplay: avgPnl === null ? '—' : formatPnl(avgPnl, currency),
    avgPnlStyle: avgPnl === null ? undefined : pnlColor(avgPnl, c),
    winRateDisplay: winRate === null ? '—' : `${winRate}%`,
    rrDisplay: rr === null ? '—' : rr.toFixed(2),
    avgPipsDisplay: avgPips === null ? '—' : formatPips(avgPips),
    avgPipsStyle: avgPips === null ? undefined : pnlColor(avgPips, c),
    pfDisplay: pf === null ? '—' : pf === Infinity ? '∞' : pf.toFixed(2),
    bestDisplay: best === null ? '—' : formatPnl(best, currency),
    bestStyle: best === null ? undefined : pnlColor(best, c),
    worstDisplay: worst === null ? '—' : formatPnl(worst, currency),
    worstStyle: worst === null ? undefined : pnlColor(worst, c),
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
  // ロケール非依存の中性表記。表示時に locale で再整形する。
  const label = `${start.getFullYear()}/${start.getMonth() + 1}`;
  return { start, end, label };
}

/** MonthRange.start を ロケールに合わせた「2026年5月 / May 2026」風表記にする */
function localizedMonthLabel(
  start: Date,
  locale: string | null | undefined,
): string {
  try {
    return new Intl.DateTimeFormat(pickerLocale(locale), {
      year: 'numeric',
      month: 'long',
    }).format(start);
  } catch {
    return `${start.getFullYear()}/${start.getMonth() + 1}`;
  }
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

type Horizon = 'week' | 'month' | 'half' | 'year';

const HORIZONS: Horizon[] = ['week', 'month', 'half', 'year'];

function horizonEnd(h: Horizon): Date {
  const now = new Date();
  if (h === 'week') {
    const d = new Date(now);
    const daysToSun = (7 - d.getDay()) % 7;
    d.setDate(d.getDate() + daysToSun);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  if (h === 'month') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  if (h === 'half') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 6);
    return d;
  }
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

type Projection = {
  curve: { x: number; v: number }[]; // x=timestamp(ms), v=累積損益
  currentTotal: number;
  projectedTotal: number;
  pacePerDay: number;
  startMs: number;
  nowMs: number;
  horizonMs: number;
};

const DAY_MS = 86_400_000;

function buildProjection(trades: Trade[], h: Horizon): Projection | null {
  const withPnl = trades
    .filter((t) => t.pnl !== null)
    .sort(
      (a, b) =>
        new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
    );
  if (withPnl.length < 2) return null;

  const nowMs = Date.now();
  let acc = 0;
  const curve = withPnl.map((t) => {
    acc += t.pnl ?? 0;
    return { x: new Date(t.traded_at).getTime(), v: acc };
  });
  const startMs = curve[0].x;
  const currentTotal = acc;
  const spanDays = Math.max(1, (nowMs - startMs) / DAY_MS);
  const pacePerDay = currentTotal / spanDays;
  const horizonMs = horizonEnd(h).getTime();
  const daysAhead = Math.max(0, (horizonMs - nowMs) / DAY_MS);
  const projectedTotal = currentTotal + pacePerDay * daysAhead;
  return { curve, currentTotal, projectedTotal, pacePerDay, startMs, nowMs, horizonMs };
}

function ProjectionChart({ proj, color }: { proj: Projection; color: string }) {
  const W = SCREEN_WIDTH - 64;
  const H = 130;
  const pad = 6;
  const innerH = H - pad * 2;

  const spanX = Math.max(1, proj.horizonMs - proj.startMs);
  const xAt = (ms: number) => ((ms - proj.startMs) / spanX) * W;

  const vals = proj.curve.map((p) => p.v);
  const min = Math.min(0, ...vals, proj.projectedTotal);
  const max = Math.max(0, ...vals, proj.projectedTotal);
  const range = max - min || 1;
  const yAt = (v: number) => pad + innerH - ((v - min) / range) * innerH;

  // 実績(最終トレード→現在は横ばい)
  const actualLine =
    proj.curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.x).toFixed(1)},${yAt(p.v).toFixed(1)}`)
      .join(' ') + ` L${xAt(proj.nowMs).toFixed(1)},${yAt(proj.currentTotal).toFixed(1)}`;
  const projLine = `M${xAt(proj.nowMs).toFixed(1)},${yAt(proj.currentTotal).toFixed(1)} L${xAt(proj.horizonMs).toFixed(1)},${yAt(proj.projectedTotal).toFixed(1)}`;
  const zeroY = yAt(0);
  const nowX = xAt(proj.nowMs);

  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {min < 0 && max > 0 ? (
        <Path
          d={`M0,${zeroY.toFixed(1)} L${W},${zeroY.toFixed(1)}`}
          stroke="rgba(127,127,127,0.4)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ) : null}
      {/* 現在の縦線 */}
      <Path
        d={`M${nowX.toFixed(1)},${pad} L${nowX.toFixed(1)},${H - pad}`}
        stroke="rgba(127,127,127,0.3)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <Path
        d={`${actualLine} L${nowX.toFixed(1)},${(H - pad).toFixed(1)} L0,${(H - pad).toFixed(1)} Z`}
        fill="url(#projFill)"
      />
      <Path d={actualLine} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      <Path d={projLine} stroke={color} strokeWidth={2.5} strokeDasharray="5 5" fill="none" opacity={0.7} />
      <Circle cx={nowX} cy={yAt(proj.currentTotal)} r={3.5} fill={color} />
      <Circle cx={xAt(proj.horizonMs)} cy={yAt(proj.projectedTotal)} r={4.5} fill={color} opacity={0.55} />
    </Svg>
  );
}

function ProjectionCard({
  trades,
  currency,
}: {
  trades: Trade[];
  currency?: string | null;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [horizon, setHorizon] = useState<Horizon>('month');
  const proj = useMemo(() => buildProjection(trades, horizon), [trades, horizon]);

  if (!proj) return null;
  const color = proj.projectedTotal >= 0 ? c.win : c.loss;

  return (
    <>
      <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
        {t('analytics.projectionTitle')}
      </Text>
      <View style={styles.dataCard}>
        <View style={styles.projHorizonRow}>
          {HORIZONS.map((h) => {
            const active = horizon === h;
            return (
              <Pressable
                key={h}
                onPress={() => setHorizon(h)}
                style={[
                  styles.projHorizonChip,
                  { backgroundColor: active ? c.accent : c.surfaceAlt },
                ]}
              >
                <Text
                  style={[
                    styles.projHorizonText,
                    { color: active ? '#fff' : c.textSecondary },
                  ]}
                >
                  {t(`analytics.horizon_${h}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.projCaption}>{t('analytics.projectionCaption')}</Text>
        <Text style={[styles.projValue, { color }]}>
          {formatPnl(proj.projectedTotal, currency)}
        </Text>
        <ProjectionChart proj={proj} color={color} />
        <View style={styles.projChips}>
          <View style={styles.projChip}>
            <Text style={styles.projChipLabel}>{t('analytics.current')}</Text>
            <Text style={styles.projChipValue}>
              {formatPnl(proj.currentTotal, currency)}
            </Text>
          </View>
          <View style={styles.projChip}>
            <Text style={styles.projChipLabel}>
              {t('analytics.projectionPaceLabel')}
            </Text>
            <Text style={styles.projChipValue}>
              {formatPnl(proj.pacePerDay, currency)}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

function ymdKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// GitHub風の年間ヒートマップ（日別損益を色分け）
function TradeHeatmap({
  trades,
  currency,
}: {
  trades: Trade[];
  currency?: string | null;
}) {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [sel, setSel] = useState<{ key: string; pnl: number; date: Date } | null>(
    null,
  );

  const { weeks, maxAbs } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const tr of trades) {
      if (tr.pnl === null) continue;
      const d = new Date(tr.traded_at);
      const k = ymdKey(d);
      byDay.set(k, (byDay.get(k) ?? 0) + tr.pnl);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // 週初(日曜)に揃える
    const ws: { date: Date; key: string; pnl: number | null }[][] = [];
    const cur = new Date(start);
    let mAbs = 1;
    while (cur <= today) {
      const week: { date: Date; key: string; pnl: number | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const k = ymdKey(cur);
        const isFuture = cur > today;
        const pnl = !isFuture && byDay.has(k) ? (byDay.get(k) as number) : null;
        if (pnl !== null) mAbs = Math.max(mAbs, Math.abs(pnl));
        week.push({ date: new Date(cur), key: k, pnl: isFuture ? null : pnl });
        cur.setDate(cur.getDate() + 1);
      }
      ws.push(week);
    }
    return { weeks: ws, maxAbs: mAbs };
  }, [trades]);

  const cellColor = (pnl: number | null) => {
    if (pnl === null) return c.surfaceAlt;
    if (pnl === 0) return c.border;
    const ratio = Math.min(1, Math.abs(pnl) / maxAbs);
    const level = ratio > 0.66 ? 0.95 : ratio > 0.33 ? 0.65 : 0.38;
    return withOpacity(pnl > 0 ? c.win : c.loss, level);
  };

  const CELL = 12;
  const GAP = 3;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 22, marginBottom: 6, gap: 8 }}>
        {sel ? (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>
              {formatDate(sel.date, locale)}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: sel.pnl >= 0 ? c.win : c.loss,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatPnl(sel.pnl, currency)}
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 12, color: c.textSecondary }}>
            {t('analytics.heatmapHint')}
          </Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={(r) => r?.scrollToEnd?.({ animated: false })}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map((day) => {
                const active = sel?.key === day.key;
                return (
                  <Pressable
                    key={day.key}
                    onPress={() =>
                      day.pnl !== null
                        ? setSel(active ? null : { key: day.key, pnl: day.pnl, date: day.date })
                        : setSel(null)
                    }
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      backgroundColor: cellColor(day.pnl),
                      borderWidth: active ? 1.5 : 0,
                      borderColor: c.textPrimary,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      {/* 凡例 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: c.textSecondary }}>{t('analytics.lossLabel')}</Text>
        <View style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: withOpacity(c.loss, 0.95) }} />
        <View style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: withOpacity(c.loss, 0.4) }} />
        <View style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: c.surfaceAlt }} />
        <View style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: withOpacity(c.win, 0.4) }} />
        <View style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: withOpacity(c.win, 0.95) }} />
        <Text style={{ fontSize: 10, color: c.textSecondary }}>{t('analytics.winLabel')}</Text>
      </View>
    </View>
  );
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

function buildWinLossDistribution(
  monthly: Trade[],
  c: ThemeColors,
  labels: { win: string; loss: string; unset: string },
) {
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
      name: labels.win,
      population: wins,
      color: c.win,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  if (losses > 0) {
    result.push({
      name: labels.loss,
      population: losses,
      color: c.loss,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  if (neutral > 0) {
    result.push({
      name: labels.unset,
      population: neutral,
      color: c.textSecondary,
      legendFontColor: c.textPrimary,
      legendFontSize: 12,
    });
  }
  return result;
}

function formatPnl(n: number, currency: string | null | undefined): string {
  return formatPnlWithCurrency(n, currency);
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerText: { flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statsButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
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
    premiumSectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 0,
      marginBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    monthArrow: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    monthArrowDisabled: { opacity: 0.4 },
    monthArrowText: { fontSize: 18, color: c.textPrimary, fontWeight: '700' },
    monthLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    goalCard: {
      backgroundColor: c.surface,
      borderRadius: 10,
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
    goalPct: { fontSize: 18, fontWeight: '800', color: c.accent, fontVariant: ['tabular-nums'] },
    goalBarBg: {
      height: 8,
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      overflow: 'hidden',
    },
    goalBar: {
      height: '100%',
      borderRadius: 8,
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
      borderRadius: 10,
      padding: 12,
    },
    kpiLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4 },
    kpiValue: { fontSize: 17, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] },
    primaryKpi: {
      paddingTop: 8,
      paddingBottom: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    primaryKpiLabel: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    primaryKpiValue: {
      fontSize: 48,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.5,
    },
    secondaryKpiList: {
      paddingBottom: 8,
    },
    kpiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    kpiRowLabel: {
      fontSize: 13,
      color: c.textSecondary,
    },
    kpiRowValue: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    chartCard: {
      paddingVertical: 8,
      paddingHorizontal: 0,
      alignItems: 'center',
    },
    dataCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 4,
    },
    projCaption: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 2,
    },
    projValue: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: 12,
      fontVariant: ['tabular-nums'],
    },
    projHorizonRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    projHorizonChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    projHorizonText: { fontSize: 12, fontWeight: '700' },
    projChips: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    projChip: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    projChipLabel: {
      fontSize: 11,
      color: c.textSecondary,
      marginBottom: 2,
    },
    projChipValue: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
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
      borderRadius: 8,
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
      fontVariant: ['tabular-nums'],
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
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    calendarCellWin: { backgroundColor: c.win },
    calendarCellLoss: { backgroundColor: c.loss },
    calendarCellSelected: {
      borderWidth: 2,
      borderColor: c.accent,
    },
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
      fontVariant: ['tabular-nums'],
    },
    dayDetailCard: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 14,
      marginTop: 12,
    },
    dayDetailHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    dayDetailTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    dayDetailSummary: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    dayDetailSummaryItem: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      padding: 10,
    },
    dayDetailSummaryLabel: {
      fontSize: 11,
      color: c.textSecondary,
      marginBottom: 4,
    },
    dayDetailSummaryValue: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    dayDetailDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginBottom: 12,
    },
    dayTradeCard: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      padding: 12,
      gap: 6,
    },
    dayTradeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dayTradeNumbers: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
    },
    dayTradeMemo: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
      marginTop: 2,
    },
    dayEmptyWrap: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    dayEmptyText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    dayEmptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
    },
    dayEmptyCtaText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
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
      borderRadius: 10,
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
      borderRadius: 10,
      overflow: 'hidden',
    },
    lockedBlur: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 10,
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
      borderRadius: 10,
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
      borderRadius: 10,
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
    dirPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    dirPillText: { fontSize: 11, fontWeight: '700' },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
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
      borderRadius: 10,
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
    tradePnl: { fontSize: 18, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] },
    tradePips: { fontSize: 13, fontWeight: '500', color: c.textSecondary, fontVariant: ['tabular-nums'] },
  });
}
