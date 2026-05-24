import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

import { PremiumGate } from '@/components/premium-gate';
import { PremiumTag } from '@/components/premium-tag';
import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { AnalyticsEvents } from '@/lib/analytics';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { notifySuccess } from '@/lib/haptics';
import { parseMt5Rows, ParseResult } from '@/lib/mt5-import';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';

export default function ImportTradesScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { refresh } = useTrades();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const pickAndParse = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/html',
          '*/*',
        ],
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setBusy(true);
      setResult(null);

      const isText = /\.(csv|htm|html)$/i.test(asset.name ?? '');
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: isText
          ? FileSystem.EncodingType.UTF8
          : FileSystem.EncodingType.Base64,
      });
      const wb = XLSX.read(content, { type: isText ? 'string' : 'base64' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      const parsed = parseMt5Rows(rows);
      setResult(parsed);
      if (parsed.errorKey) {
        toast.error?.(t(`mt5Import.err_${parsed.errorKey}`));
      }
    } catch {
      toast.error?.(t('mt5Import.err_read'));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!result || result.trades.length === 0 || !session?.user.id) return;
    setBusy(true);
    try {
      const userId = session.user.id;
      const payload = result.trades.map((tr) => ({
        user_id: userId,
        currency_pair: tr.currencyPair,
        direction: tr.direction,
        result: tr.result,
        entry_price: tr.entryPrice,
        exit_price: tr.exitPrice,
        lot_size: tr.lotSize,
        pnl: tr.pnl,
        pnl_pips: null,
        memo: `MT5 #${tr.externalId}`,
        traded_at: tr.tradedAt,
        is_shared: false,
        external_id: tr.externalId,
        source: 'mt5_import',
      }));
      const { error } = await supabase
        .from('trades')
        .upsert(payload, {
          onConflict: 'user_id,external_id',
          ignoreDuplicates: true,
        });
      if (error) throw new Error(error.message);

      AnalyticsEvents.csvExported('mt5_import');
      notifySuccess();
      await refresh();
      toast.success(t('mt5Import.success', { count: result.trades.length }));
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error?.(`${t('mt5Import.err_import')}: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const preview = result && !result.errorKey ? result : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('mt5Import.title')}</Text>
          <PremiumTag />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <PremiumGate feature="stats">
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.desc}>{t('mt5Import.desc')}</Text>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>{t('mt5Import.howTitle')}</Text>
            <Text style={styles.step}>{t('mt5Import.how1')}</Text>
            <Text style={styles.step}>{t('mt5Import.how2')}</Text>
            <Text style={styles.step}>{t('mt5Import.how3')}</Text>
          </View>

          <Pressable
            onPress={pickAndParse}
            disabled={busy}
            style={({ pressed }) => [
              styles.pickBtn,
              pressed && { opacity: 0.85 },
              busy && { opacity: 0.5 },
            ]}
          >
            {busy && !preview ? (
              <ActivityIndicator color={c.accent} />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={20} color={c.accent} />
                <Text style={styles.pickBtnText}>{t('mt5Import.pickFile')}</Text>
              </>
            )}
          </Pressable>

          {preview && (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('mt5Import.found')}</Text>
                  <Text style={styles.summaryValue}>
                    {t('mt5Import.tradesCount', { count: preview.trades.length })}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('stats.total_pnl')}</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color: preview.totalPnl >= 0 ? c.win : c.loss,
                      },
                    ]}
                  >
                    {formatPnlWithCurrency(preview.totalPnl, profile?.currency)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('stats.win_rate')}</Text>
                  <Text style={styles.summaryValue}>
                    {((preview.wins / preview.trades.length) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.previewHint}>{t('mt5Import.previewHint')}</Text>
              {preview.trades.slice(0, 8).map((tr) => (
                <View key={tr.externalId} style={styles.tradeRow}>
                  <Text style={styles.tradePair}>{tr.currencyPair}</Text>
                  <View
                    style={[
                      styles.dirPill,
                      {
                        backgroundColor:
                          tr.direction === 'long' ? `${c.win}1A` : `${c.loss}1A`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dirText,
                        { color: tr.direction === 'long' ? c.win : c.loss },
                      ]}
                    >
                      {tr.direction === 'long' ? t('common.long') : t('common.short')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tradePnl,
                      { color: tr.pnl >= 0 ? c.win : c.loss },
                    ]}
                  >
                    {formatPnlWithCurrency(tr.pnl, profile?.currency)}
                  </Text>
                </View>
              ))}
              {preview.trades.length > 8 && (
                <Text style={styles.moreText}>
                  {t('mt5Import.andMore', {
                    count: preview.trades.length - 8,
                  })}
                </Text>
              )}

              <Pressable
                onPress={doImport}
                disabled={busy}
                style={({ pressed }) => [
                  styles.importBtn,
                  pressed && { opacity: 0.85 },
                  busy && { opacity: 0.5 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.importBtnText}>
                    {t('mt5Import.importBtn', { count: preview.trades.length })}
                  </Text>
                )}
              </Pressable>
              <Text style={styles.dupNote}>{t('mt5Import.dupNote')}</Text>
            </>
          )}
        </ScrollView>
      </PremiumGate>
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
    body: { padding: 20, paddingBottom: 48 },
    desc: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 21,
      marginBottom: 16,
    },
    stepsCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      gap: 8,
      marginBottom: 20,
    },
    stepsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    step: { fontSize: 13, color: c.textPrimary, lineHeight: 19 },
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.accent,
      backgroundColor: `${c.accent}0D`,
    },
    pickBtnText: { fontSize: 15, fontWeight: '700', color: c.accent },
    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      marginTop: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    summaryLabel: { fontSize: 14, color: c.textSecondary },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    previewHint: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 20,
      marginBottom: 8,
    },
    tradeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tradePair: { fontSize: 14, fontWeight: '700', color: c.textPrimary, width: 84 },
    dirPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    dirText: { fontSize: 11, fontWeight: '700' },
    tradePnl: {
      marginLeft: 'auto',
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    moreText: {
      fontSize: 13,
      color: c.textSecondary,
      paddingVertical: 10,
      textAlign: 'center',
    },
    importBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    importBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    dupNote: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      opacity: 0.7,
    },
  });
}
