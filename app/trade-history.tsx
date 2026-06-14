import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { TradeRow } from '@/components/trade-row';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/types';

export default function TradeHistoryScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { trades, refresh, deleteTrade } = useTrades();

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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/import-trades')}
            hitSlop={12}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.exportButtonPressed,
            ]}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={c.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {trades.length === 0 ? (
          <EmptyState
            icon="trending-up-outline"
            title={t('empty.trades_title')}
            subtitle={t('empty.trades_subtitle')}
            actionLabel={t('empty.trades_action')}
            onAction={() => router.push('/(tabs)/record')}
          />
        ) : (
          trades.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              onPress={() => router.push(`/trade/${trade.id}`)}
              onLongPress={() => handleDelete(trade)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
