import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { Trade } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

const ACCENT_GREEN = '#10B981';
const ACCENT_INDIGO = '#6366F1';
const CARD_BG = '#0B0B0F';
const CARD_WIN = '#22C55E';
const CARD_LOSS = '#EF4444';

type Period = 'week' | 'month';

type CardStats = {
  count: number;
  totalPnl: number;
  hasPnl: boolean;
  winRate: number | null;
  bestPair: string | null;
};

function rangeStart(period: Period): Date {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function computeCardStats(trades: Trade[]): CardStats {
  const withPnl = trades.filter((t) => t.pnl !== null);
  const totalPnl = withPnl.reduce((s, t) => s + (t.pnl ?? 0), 0);

  const withResult = trades.filter((t) => t.result !== null);
  const wins = withResult.filter((t) => t.result === 'win').length;
  const winRate =
    withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : null;

  // ベスト銘柄: 期間内で合計損益が最大の通貨ペア
  const pairPnl = new Map<string, number>();
  for (const t of withPnl) {
    pairPnl.set(t.currency_pair, (pairPnl.get(t.currency_pair) ?? 0) + (t.pnl ?? 0));
  }
  let bestPair: string | null = null;
  let bestVal = -Infinity;
  for (const [pair, val] of pairPnl.entries()) {
    if (val > bestVal) {
      bestVal = val;
      bestPair = pair;
    }
  }

  return {
    count: trades.length,
    totalPnl,
    hasPnl: withPnl.length > 0,
    winRate,
    bestPair,
  };
}

export default function ShareCardScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { trades } = useTrades();
  const { profile } = useProfile();
  const styles = useMemo(() => makeStyles(c), [c]);
  const viewShotRef = useRef<ViewShot>(null);

  const [period, setPeriod] = useState<Period>('week');
  const [busy, setBusy] = useState(false);

  const currency = profile?.currency;
  const username = profile?.username ?? null;
  const displayName = profile?.display_name ?? username ?? 'Trader';

  const periodTrades = useMemo(() => {
    const start = rangeStart(period);
    return trades.filter((tr) => new Date(tr.traded_at) >= start);
  }, [trades, period]);

  const stats = useMemo(() => computeCardStats(periodTrades), [periodTrades]);
  const isEmpty = stats.count === 0;

  const periodLabel = period === 'week' ? t('shareCard.periodWeek') : t('shareCard.periodMonth');
  const pnlColor = !stats.hasPnl
    ? '#FFFFFF'
    : stats.totalPnl > 0
      ? CARD_WIN
      : stats.totalPnl < 0
        ? CARD_LOSS
        : '#FFFFFF';

  const handleShare = async () => {
    if (!viewShotRef.current || isEmpty) return;
    setBusy(true);
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1350,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('shareCard.shareMessage'),
        });
      } else {
        // 共有不可端末では写真保存にフォールバック
        await handleSave();
      }
    } catch {
      Alert.alert(t('shareCard.title'), t('shareCard.shareError'));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!viewShotRef.current || isEmpty) return;
    setBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('shareCard.title'), t('shareCard.permissionRequired'));
        setBusy(false);
        return;
      }
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1350,
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('shareCard.title'), t('shareCard.saved'));
    } catch {
      Alert.alert(t('shareCard.title'), t('shareCard.shareError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('shareCard.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* 期間トグル */}
        <View style={styles.toggleRow}>
          {(['week', 'month'] as Period[]).map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.toggleItem, active && styles.toggleItemActive]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    active ? styles.toggleTextActive : styles.toggleTextInactive,
                  ]}
                >
                  {p === 'week' ? t('shareCard.thisWeek') : t('shareCard.thisMonth')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* シェアカード本体（キャプチャ対象） */}
        <View style={styles.cardShadow}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={[styles.viewShot, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
          >
            <View style={styles.card}>
              {/* 上部: 期間 + ロゴ */}
              <View style={styles.cardTop}>
                <Text style={styles.periodLabel}>{periodLabel}</Text>
                <View style={styles.logoRow}>
                  <Text style={styles.logoTrade}>Trade</Text>
                  <Text style={styles.logoLog}>Log</Text>
                </View>
              </View>

              {/* 中央: 純損益を大きく */}
              <View style={styles.cardCenter}>
                <Text style={styles.netLabel}>{t('shareCard.netPnl')}</Text>
                <Text
                  style={[styles.netValue, { color: pnlColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {stats.hasPnl ? formatPnlWithCurrency(stats.totalPnl, currency) : '—'}
                </Text>
              </View>

              {/* 下部: サブ指標 */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {stats.winRate === null ? '—' : `${stats.winRate}%`}
                  </Text>
                  <Text style={styles.statLabel}>{t('shareCard.winRate')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.count}</Text>
                  <Text style={styles.statLabel}>{t('shareCard.trades')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.bestPair ?? '—'}
                  </Text>
                  <Text style={styles.statLabel}>{t('shareCard.bestPair')}</Text>
                </View>
              </View>

              {/* フッター: ユーザー名 + ハッシュタグ */}
              <View style={styles.cardFooter}>
                <View style={styles.footerUser}>
                  <Text style={styles.footerName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {username ? (
                    <Text style={styles.footerHandle} numberOfLines={1}>
                      @{username}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.footerTag}>#TradeLog</Text>
              </View>
            </View>
          </ViewShot>
        </View>

        {isEmpty ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('shareCard.empty')}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              onPress={handleShare}
              disabled={busy}
              style={[styles.primaryButton, busy && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonInline}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>{t('shareCard.share')}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={busy}
              style={[styles.secondaryButton, busy && styles.disabled]}
            >
              <View style={styles.buttonInline}>
                <Ionicons name="download-outline" size={18} color={c.textPrimary} />
                <Text style={styles.secondaryButtonText}>{t('shareCard.save')}</Text>
              </View>
            </Pressable>
          </View>
        )}
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 26 },
    body: { padding: 20, paddingBottom: 48, alignItems: 'center' },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: 999,
      padding: 4,
      marginBottom: 24,
      alignSelf: 'center',
    },
    toggleItem: {
      paddingVertical: 8,
      paddingHorizontal: 24,
      borderRadius: 999,
    },
    toggleItemActive: { backgroundColor: c.accent },
    toggleText: { fontSize: 14, fontWeight: '700' },
    toggleTextActive: { color: c.onAccent },
    toggleTextInactive: { color: c.textSecondary },
    cardShadow: {
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 14,
      marginBottom: 28,
    },
    viewShot: { borderRadius: 24, overflow: 'hidden' },
    card: {
      width: '100%',
      height: '100%',
      backgroundColor: CARD_BG,
      padding: 28,
      justifyContent: 'space-between',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    periodLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: ACCENT_INDIGO,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    logoRow: { flexDirection: 'row', alignItems: 'baseline' },
    logoTrade: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    logoLog: { fontSize: 16, fontWeight: '800', color: ACCENT_GREEN, letterSpacing: -0.3 },
    cardCenter: { alignItems: 'flex-start' },
    netLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    netValue: {
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    statBox: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '600',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerUser: { flex: 1, marginRight: 12 },
    footerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    footerHandle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    footerTag: { fontSize: 12, fontWeight: '700', color: ACCENT_GREEN },
    emptyBox: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 24,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
      width: '100%',
    },
    emptyText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    actions: { width: '100%', gap: 12 },
    primaryButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.border,
    },
    secondaryButtonText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    buttonInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    disabled: { opacity: 0.5 },
  });
}
