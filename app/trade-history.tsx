import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { useTrades } from '@/hooks/use-trades';
import { exportTradesCsv } from '@/lib/export-csv';
import { getPlan } from '@/lib/premium';
import { Trade } from '@/lib/types';

export default function TradeHistoryScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { trades, refresh, deleteTrade } = useTrades();
  const { profile } = useProfile();
  const isPremium = getPlan(profile?.is_premium) === 'premium';
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!isPremium) {
      Alert.alert(
        t('tradeHistory.premiumFeatureTitle'),
        t('tradeHistory.premiumFeatureBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('tradeHistory.seePremium'),
            onPress: () => router.push('/premium'),
          },
        ],
      );
      return;
    }
    if (trades.length === 0) {
      Alert.alert(t('tradeHistory.noDataTitle'), t('tradeHistory.noDataBody'));
      return;
    }
    setExporting(true);
    try {
      await exportTradesCsv(trades);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('tradeHistory.exportFail'), msg);
    } finally {
      setExporting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleDelete = (trade: Trade) => {
    Alert.alert(
      t('tradeHistory.confirmDeleteTitle'),
      `${trade.currency_pair} - ${trade.direction === 'long' ? t('common.long') : t('common.short')}\n${t('tradeHistory.confirmDeleteBody')}`,
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
              Alert.alert(t('tradeHistory.deleteFail'), msg);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('tradeHistory.title')}</Text>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          hitSlop={12}
          style={({ pressed }) => [
            styles.exportButton,
            pressed && styles.exportButtonPressed,
          ]}
        >
          {exporting ? (
            <ActivityIndicator color={c.accent} size="small" />
          ) : (
            <Ionicons
              name={isPremium ? 'share-outline' : 'lock-closed-outline'}
              size={20}
              color={c.textPrimary}
            />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {trades.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={c.textSecondary}
            />
            <Text style={styles.emptyText}>{t('tradeHistory.emptyMessage')}</Text>
          </View>
        ) : (
          trades.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              onPress={() => router.push(`/trade-edit?id=${trade.id}`)}
              onLongPress={() => handleDelete(trade)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TradeRow({
  trade,
  onPress,
  onLongPress,
}: {
  trade: Trade;
  onPress: () => void;
  onLongPress: () => void;
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
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.pair}>{trade.currency_pair}</Text>
        <Text style={styles.direction}>{directionLabel}</Text>
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
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.pnl, pnlColor(trade.pnl, c)]}>
          {trade.pnl !== null ? formatPnlWithCurrency(trade.pnl, currency) : '—'}
        </Text>
        {trade.pnl_pips !== null && (
          <Text style={[styles.pips, pnlColor(trade.pnl_pips, c)]}>
            {formatPips(trade.pnl_pips)}
          </Text>
        )}
      </View>
      <Text style={styles.hint}>{t('tradeHistory.hint')}</Text>
    </Pressable>
  );
}

// formatPnl は formatPnlWithCurrency(n, currency) に置換済み

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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: {
      fontSize: 15,
      color: c.textSecondary,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    exportButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exportButtonPressed: {
      opacity: 0.5,
    },
    body: {
      padding: 16,
      paddingBottom: 40,
      gap: 8,
    },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 32,
      alignItems: 'center',
      marginTop: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    row: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 14,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    pair: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    direction: {
      fontSize: 13,
      color: c.textSecondary,
    },
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    resultBadgeWin: {
      backgroundColor: c.win,
    },
    resultBadgeLoss: {
      backgroundColor: c.loss,
    },
    resultBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    date: {
      marginLeft: 'auto',
      fontSize: 11,
      color: c.textSecondary,
    },
    rowMid: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 4,
    },
    pnl: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    pips: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
    },
    hint: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 4,
    },
  });
}
