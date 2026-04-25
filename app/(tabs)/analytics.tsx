import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/types';

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_SECONDARY = '#94A3B8';
const WIN_COLOR = '#10B981';
const LOSS_COLOR = '#EF4444';

export default function AnalyticsScreen() {
  const { trades, loading, error, refresh, deleteTrade } = useTrades();
  const [refreshing, setRefreshing] = useState(false);

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

  const stats = computeMonthlyStats(trades);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>あなたのトレード成績</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
            />
          }
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>エラー: {error}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>今月の成績</Text>

          <View style={styles.kpiRow}>
            <KpiCard
              label="月間P&L"
              value={stats.pnlDisplay}
              valueStyle={stats.pnlStyle}
            />
            <KpiCard label="勝率" value={stats.winRateDisplay} />
          </View>

          <View style={styles.kpiRow}>
            <KpiCard label="取引回数" value={`${stats.tradeCount}回`} />
            <KpiCard
              label="平均pips"
              value={stats.avgPipsDisplay}
              valueStyle={stats.avgPipsStyle}
            />
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
            直近の取引
          </Text>

          {trades.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                まだ取引がありません。{'\n'}
                記録タブから取引を追加してください。
              </Text>
            </View>
          ) : (
            trades.slice(0, 20).map((trade) => (
              <TradeRow key={trade.id} trade={trade} onDelete={handleDelete} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
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
          <Text style={styles.deleteButtonText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.tradeRowMid}>
        <Text style={[styles.tradePnl, pnlColor(trade.pnl)]}>
          {trade.pnl !== null ? formatPnl(trade.pnl) : '—'}
        </Text>
        {trade.pnl_pips !== null && (
          <Text style={[styles.tradePips, pnlColor(trade.pnl_pips)]}>
            {formatPips(trade.pnl_pips)}
          </Text>
        )}
      </View>
    </View>
  );
}

type MonthlyStats = {
  tradeCount: number;
  pnlDisplay: string;
  pnlStyle?: TextStyle;
  winRateDisplay: string;
  avgPipsDisplay: string;
  avgPipsStyle?: TextStyle;
};

function computeMonthlyStats(trades: Trade[]): MonthlyStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthly = trades.filter((t) => new Date(t.traded_at) >= monthStart);

  const withPnl = monthly.filter((t) => t.pnl !== null);
  const totalPnl = withPnl.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const withResult = monthly.filter((t) => t.result !== null);
  const winCount = withResult.filter((t) => t.result === 'win').length;
  const winRate =
    withResult.length > 0
      ? Math.round((winCount / withResult.length) * 100)
      : null;

  const withPips = monthly.filter((t) => t.pnl_pips !== null);
  const avgPips =
    withPips.length > 0
      ? withPips.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0) / withPips.length
      : null;

  return {
    tradeCount: monthly.length,
    pnlDisplay: withPnl.length === 0 ? '—' : formatPnl(totalPnl),
    pnlStyle: withPnl.length === 0 ? undefined : pnlColor(totalPnl),
    winRateDisplay: winRate === null ? '—' : `${winRate}%`,
    avgPipsDisplay: avgPips === null ? '—' : formatPips(avgPips),
    avgPipsStyle: avgPips === null ? undefined : pnlColor(avgPips),
  };
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} pips`;
}

function pnlColor(n: number | null): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? WIN_COLOR : LOSS_COLOR };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelMt: {
    marginTop: 28,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  tradeRow: {
    backgroundColor: SURFACE,
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
  tradePair: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  tradeDirection: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultBadgeWin: {
    backgroundColor: WIN_COLOR,
  },
  resultBadgeLoss: {
    backgroundColor: LOSS_COLOR,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  tradeDate: {
    marginLeft: 'auto',
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  deleteButtonPressed: {
    backgroundColor: BORDER,
  },
  deleteButtonText: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    fontWeight: '500',
    lineHeight: 18,
  },
  tradeRowMid: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  tradePnl: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  tradePips: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
});
