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
import Svg, { Defs, LinearGradient, Path, Stop, Line } from 'react-native-svg';
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

type Period = 'day' | 'week' | 'month';

type CardTheme = 'classic' | 'gold' | 'mint';

const CARD_THEMES: Record<
  CardTheme,
  {
    bg: string;
    win: string;
    loss: string;
    accent: string;
    logoTrade: string;
    logoLog: string;
    period: string;
    netLabel: string;
    statBg: string;
    text: string;
    muted: string;
    border: string;
    footerTag: string;
    sparkNeutral: string;
  }
> = {
  classic: {
    bg: '#0B0B0F',
    win: '#22C55E',
    loss: '#EF4444',
    accent: ACCENT_GREEN,
    logoTrade: '#FFFFFF',
    logoLog: ACCENT_GREEN,
    period: ACCENT_INDIGO,
    netLabel: 'rgba(255,255,255,0.5)',
    statBg: 'rgba(255,255,255,0.04)',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.5)',
    border: 'rgba(255,255,255,0.06)',
    footerTag: ACCENT_GREEN,
    sparkNeutral: ACCENT_INDIGO,
  },
  gold: {
    bg: '#1A1306',
    win: '#FFD66B',
    loss: '#EF4444',
    accent: '#FFD66B',
    logoTrade: '#FFE89A',
    logoLog: '#FFD66B',
    period: '#FFD66B',
    netLabel: 'rgba(255,234,170,0.6)',
    statBg: 'rgba(255,247,214,0.06)',
    text: '#FFF7D6',
    muted: 'rgba(255,247,214,0.6)',
    border: 'rgba(255,214,107,0.2)',
    footerTag: '#FFD66B',
    sparkNeutral: '#FFD66B',
  },
  mint: {
    bg: '#F4FBF6',
    win: '#0F7A45',
    loss: '#D14F4F',
    accent: ACCENT_GREEN,
    logoTrade: '#0F172A',
    logoLog: ACCENT_GREEN,
    period: ACCENT_GREEN,
    netLabel: '#6B7280',
    statBg: 'rgba(16,185,129,0.08)',
    text: '#0F172A',
    muted: '#6B7280',
    border: 'rgba(16,185,129,0.18)',
    footerTag: ACCENT_GREEN,
    sparkNeutral: ACCENT_GREEN,
  },
};

type CardStats = {
  count: number;
  totalPnl: number;
  hasPnl: boolean;
  winRate: number | null;
  bestPair: string | null;
  profitFactor: number | null;
  verified: boolean;
  curve: number[];
};

function rangeStart(period: Period): Date {
  const now = new Date();
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
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

  // プロフィットファクター（総利益 / 総損失）
  const grossWin = withPnl
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    withPnl.filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0),
  );
  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;

  // 検証済み: 期間内取引がすべて MT5 取込由来か
  const verified =
    trades.length > 0 && trades.every((t) => t.source === 'mt5_import');

  // エクイティ曲線: 取引日時順に累積損益（0 始点）
  const sorted = [...withPnl].sort(
    (a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime(),
  );
  const curve: number[] = [0];
  let acc = 0;
  for (const t of sorted) {
    acc += t.pnl ?? 0;
    curve.push(acc);
  }

  return {
    count: trades.length,
    totalPnl,
    hasPnl: withPnl.length > 0,
    winRate,
    bestPair,
    profitFactor,
    verified,
    curve,
  };
}

function EquitySparkline({
  points,
  color,
  width,
  height,
}: {
  points: number[];
  color: string;
  width: number;
  height: number;
}) {
  if (points.length < 2) return null;
  const pad = 4;
  const innerH = height - pad * 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => pad + innerH - ((v - min) / range) * innerH;
  const coords = points.map((v, i) => ({ x: i * stepX, y: toY(v) }));
  const line = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const zeroY = toY(0);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.32} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {min < 0 && max > 0 ? (
        <Line
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ) : null}
      <Path d={area} fill="url(#equityFill)" />
      <Path
        d={line}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
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
  const [theme, setTheme] = useState<CardTheme>('classic');
  const [busy, setBusy] = useState(false);
  const T = CARD_THEMES[theme];

  const currency = profile?.currency;
  const username = profile?.username ?? null;
  const displayName = profile?.display_name ?? username ?? 'Trader';

  const periodTrades = useMemo(() => {
    const start = rangeStart(period);
    return trades.filter((tr) => new Date(tr.traded_at) >= start);
  }, [trades, period]);

  const stats = useMemo(() => computeCardStats(periodTrades), [periodTrades]);
  const isEmpty = stats.count === 0;

  const periodLabel =
    period === 'day'
      ? t('shareCard.periodDay')
      : period === 'week'
        ? t('shareCard.periodWeek')
        : t('shareCard.periodMonth');
  const pnlColor = !stats.hasPnl
    ? T.text
    : stats.totalPnl > 0
      ? T.win
      : stats.totalPnl < 0
        ? T.loss
        : T.text;

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
          {(['day', 'week', 'month'] as Period[]).map((p) => {
            const active = period === p;
            const label =
              p === 'day'
                ? t('shareCard.today')
                : p === 'week'
                  ? t('shareCard.thisWeek')
                  : t('shareCard.thisMonth');
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
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* テンプレ選択 */}
        <View style={styles.themeRow}>
          {(['classic', 'gold', 'mint'] as CardTheme[]).map((th) => {
            const tt = CARD_THEMES[th];
            const active = theme === th;
            return (
              <Pressable
                key={th}
                onPress={() => setTheme(th)}
                style={[
                  styles.themeSwatch,
                  {
                    backgroundColor: tt.bg,
                    borderColor: active ? c.accent : tt.border,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.themeDot, { backgroundColor: tt.win }]} />
                <Text style={[styles.themeLabel, { color: tt.text }]}>
                  {t(`shareCard.theme_${th}`)}
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
            <View style={[styles.card, { backgroundColor: T.bg, borderColor: T.border }]}>
              {/* 上部: 期間 + ロゴ */}
              <View style={styles.cardTop}>
                <View style={styles.periodWrap}>
                  <Text style={[styles.periodLabel, { color: T.period }]}>{periodLabel}</Text>
                  {stats.verified ? (
                    <View style={styles.verifiedPill}>
                      <Ionicons name="shield-checkmark" size={11} color={ACCENT_GREEN} />
                      <Text style={styles.verifiedText}>{t('shareCard.verified')}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.logoRow}>
                  <Text style={[styles.logoTrade, { color: T.logoTrade }]}>Trade</Text>
                  <Text style={[styles.logoLog, { color: T.logoLog }]}>Log</Text>
                </View>
              </View>

              {/* 中央: 純損益 + エクイティ曲線 */}
              <View style={styles.cardCenter}>
                <Text style={[styles.netLabel, { color: T.netLabel }]}>{t('shareCard.netPnl')}</Text>
                <Text
                  style={[styles.netValue, { color: pnlColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {stats.hasPnl ? formatPnlWithCurrency(stats.totalPnl, currency) : '—'}
                </Text>
                {stats.curve.length >= 3 ? (
                  <View style={styles.sparkWrap}>
                    <EquitySparkline
                      points={stats.curve}
                      color={pnlColor === T.text ? T.sparkNeutral : pnlColor}
                      width={CARD_WIDTH - 56}
                      height={76}
                    />
                  </View>
                ) : null}
              </View>

              {/* 下部: サブ指標 */}
              <View style={[styles.statsRow, { backgroundColor: T.statBg }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: T.text }]}>
                    {stats.winRate === null ? '—' : `${stats.winRate}%`}
                  </Text>
                  <Text style={[styles.statLabel, { color: T.muted }]}>{t('shareCard.winRate')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: T.text }]}>
                    {stats.profitFactor === null
                      ? '—'
                      : stats.profitFactor === Infinity
                        ? '∞'
                        : stats.profitFactor.toFixed(2)}
                  </Text>
                  <Text style={[styles.statLabel, { color: T.muted }]}>{t('shareCard.profitFactor')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: T.text }]}>{stats.count}</Text>
                  <Text style={[styles.statLabel, { color: T.muted }]}>{t('shareCard.trades')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: T.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.bestPair ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: T.muted }]}>{t('shareCard.bestPair')}</Text>
                </View>
              </View>

              {/* フッター: ユーザー名 + ハッシュタグ */}
              <View style={styles.cardFooter}>
                <View style={styles.footerUser}>
                  <Text style={[styles.footerName, { color: T.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {username ? (
                    <Text style={[styles.footerHandle, { color: T.muted }]} numberOfLines={1}>
                      @{username}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.footerTag, { color: T.footerTag }]}>#TradeLog</Text>
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
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      alignSelf: 'stretch',
    },
    themeSwatch: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    themeDot: { width: 10, height: 10, borderRadius: 5 },
    themeLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
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
    periodWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    periodLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: ACCENT_INDIGO,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    verifiedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: 'rgba(16,185,129,0.12)',
    },
    verifiedText: {
      fontSize: 10,
      fontWeight: '800',
      color: ACCENT_GREEN,
      letterSpacing: 0.3,
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
    sparkWrap: {
      marginTop: 16,
      alignSelf: 'stretch',
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
      fontSize: 16,
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
