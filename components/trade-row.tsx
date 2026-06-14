import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { formatPips } from '@/lib/format-pips';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { Trade } from '@/lib/types';

/** 取引記録の1行表示（取引履歴・プロフィールの記録タブで共用）。 */
export function TradeRow({
  trade,
  onPress,
  onLongPress,
  showHint = true,
}: {
  trade: Trade;
  onPress: () => void;
  onLongPress?: () => void;
  showHint?: boolean;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const styles = useMemo(() => makeStyles(c), [c]);
  const directionLabel =
    trade.direction === 'long' ? t('common.long') : t('common.short');
  const resultLabel =
    trade.result === 'win'
      ? t('common.win')
      : trade.result === 'loss'
        ? t('common.loss')
        : null;
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
      {showHint && <Text style={styles.hint}>{t('tradeHistory.hint')}</Text>}
    </Pressable>
  );
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
    row: { backgroundColor: c.surface, borderRadius: 10, padding: 14 },
    rowPressed: { opacity: 0.7 },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    pair: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    direction: { fontSize: 13, color: c.textSecondary },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    resultBadgeWin: { backgroundColor: c.win },
    resultBadgeLoss: { backgroundColor: c.loss },
    resultBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    date: { marginLeft: 'auto', fontSize: 11, color: c.textSecondary },
    rowMid: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 4,
    },
    pnl: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
    pips: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
    hint: { fontSize: 11, color: c.textSecondary, marginTop: 4 },
  });
}
