import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { PremiumTag } from '@/components/premium-tag';
import { AnalyticsEvents } from '@/lib/analytics';
import { exportTradesCsv } from '@/lib/export-csv';
import { exportTradesPdf } from '@/lib/export-pdf';
import { selectionFeedback, successNotification } from '@/lib/haptics';
import { getPlan } from '@/lib/premium';
import { StatsPeriod } from '@/hooks/use-trade-stats';

const PERIODS: StatsPeriod[] = ['1m', '3m', '6m', '1y', 'all'];

const PERIOD_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

function periodStart(period: StatsPeriod): Date | null {
  if (period === 'all') return null;
  const since = new Date();
  since.setDate(since.getDate() - PERIOD_DAYS[period]);
  return since;
}

export default function ExportScreen() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { trades } = useTrades();
  const { profile } = useProfile();
  const isPremium = getPlan(profile?.is_premium, profile?.bonus_premium_until) === 'premium';
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const since = periodStart(period);
    return since
      ? trades.filter((t) => new Date(t.traded_at) >= since)
      : trades;
  }, [trades, period]);

  const handleExportCsv = async () => {
    if (filtered.length === 0) {
      Alert.alert(t('export.noDataTitle'), t('export.noDataBody'));
      return;
    }
    setExporting(true);
    try {
      await exportTradesCsv(filtered, locale);
      AnalyticsEvents.csvExported(period);
      successNotification();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('export.exportFail'), msg);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isPremium) {
      Alert.alert(t('export.premiumTitle'), t('export.pdfPremiumBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('export.seePremium'),
          onPress: () => router.push('/premium'),
        },
      ]);
      return;
    }
    if (filtered.length === 0) {
      Alert.alert(t('export.noDataTitle'), t('export.noDataBody'));
      return;
    }
    setExporting(true);
    try {
      await exportTradesPdf({
        trades: filtered,
        currency: profile?.currency,
        user:
          profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          t('profile.defaultName'),
        periodLabel: t(`stats.period_${period}`),
        labels: {
          reportTitle: t('export.reportTitle'),
          user: t('export.user'),
          period: t('export.period'),
          generated: t('export.generated'),
          summary: t('export.summary'),
          totalPnl: t('stats.total_pnl'),
          winRate: t('stats.win_rate'),
          trades: t('weeklyReport.trades'),
          profitFactor: t('stats.profit_factor'),
          maxDrawdown: t('stats.max_drawdown'),
          bestPair: t('shareCard.bestPair'),
          equityCurve: t('export.equityCurve'),
          byPair: t('export.byPair'),
          pair: t('export.pair'),
          pnl: t('stats.total_pnl'),
          bestDay: t('export.bestDay'),
          worstDay: t('export.worstDay'),
        },
      });
      successNotification();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('export.exportFail'), msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('export.title')}</Text>
          <PremiumTag />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="download-outline" size={28} color={c.accent} />
          </View>
          <Text style={styles.countText}>
            {t('export.totalTrades', { count: filtered.length })}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{t('export.period')}</Text>
        <View style={styles.periodList}>
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                activeOpacity={0.7}
                onPress={() => {
                  selectionFeedback();
                  setPeriod(p);
                }}
                style={[
                  styles.periodRow,
                  { borderColor: active ? c.accent : c.border },
                  active && { borderWidth: 1.5 },
                ]}
              >
                <Text style={styles.periodLabel}>{t(`stats.period_${p}`)}</Text>
                {active && (
                  <Ionicons name="checkmark" size={18} color={c.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{t('export.format')}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleExportCsv}
          disabled={exporting}
          style={[styles.formatBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <View style={styles.formatLeft}>
            <Ionicons name="grid-outline" size={20} color={c.textPrimary} />
            <View>
              <Text style={styles.formatTitle}>CSV</Text>
              <Text style={styles.formatSub}>{t('export.csvDesc')}</Text>
            </View>
          </View>
          <View style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[styles.tagText, { color: c.textSecondary }]}>Free</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleExportPdf}
          disabled={exporting}
          style={[
            styles.formatBtn,
            { backgroundColor: c.surface, borderColor: c.accent, borderWidth: 1.5 },
          ]}
        >
          <View style={styles.formatLeft}>
            <Ionicons name="document-text" size={20} color={c.accent} />
            <View>
              <Text style={styles.formatTitle}>PDF</Text>
              <Text style={styles.formatSub}>{t('export.pdfDesc')}</Text>
            </View>
          </View>
          <View style={[styles.tag, { backgroundColor: c.accent }]}>
            <Text style={[styles.tagText, { color: '#fff' }]}>Premium</Text>
          </View>
        </TouchableOpacity>

        {exporting && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <ActivityIndicator color={c.accent} />
          </View>
        )}

        <Text style={styles.note}>{t('export.csvNote')}</Text>
      </ScrollView>
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
    headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 26 },
    body: { padding: 24 },
    iconWrap: { alignItems: 'center', marginTop: 12, marginBottom: 32 },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { fontSize: 14, color: c.textSecondary, marginTop: 12 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    periodList: { gap: 8, marginBottom: 32 },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
    },
    periodLabel: { flex: 1, fontSize: 15, color: c.textPrimary },
    formatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 10,
    },
    formatLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    formatTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.5 },
    formatSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    tagText: { fontSize: 11, fontWeight: '800' },
    exportBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    exportBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    note: {
      fontSize: 12,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      opacity: 0.7,
    },
  });
}
