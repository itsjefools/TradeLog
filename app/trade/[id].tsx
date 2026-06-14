import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImageViewer } from '@/components/image-viewer';
import { VerifiedTradeBadge } from '@/components/verified-trade-badge';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { formatDate, formatTime } from '@/lib/format-date';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { supabase } from '@/lib/supabase';
import { Trade } from '@/lib/types';

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t, locale } = useI18n();
  const { profile } = useProfile();
  const currency = profile?.currency;
  const { deleteTrade } = useTrades();
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fetchTrade = useCallback(async () => {
    if (!id) {
      setError('id missing');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();
      if (e) throw new Error(e.message);
      setTrade(data as Trade);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const handleEdit = () => {
    if (!trade) return;
    router.push(`/trade-edit?id=${trade.id}`);
  };

  const handleDelete = () => {
    if (!trade) return;
    const directionLabel =
      trade.direction === 'long' ? t('common.long') : t('common.short');
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
              router.back();
            } catch (e) {
              Alert.alert(
                t('analytics.deleteFail'),
                e instanceof Error ? e.message : String(e),
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header c={c} styles={styles} router={router} t={t} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trade) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header c={c} styles={styles} router={router} t={t} />
        <View style={styles.center}>
          <Text style={styles.notFound}>{t('tradeDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const directionLabel =
    trade.direction === 'long' ? t('common.long') : t('common.short');
  const directionColor = trade.direction === 'long' ? c.win : c.loss;
  const resultLabel =
    trade.result === 'win'
      ? t('common.win')
      : trade.result === 'loss'
        ? t('common.loss')
        : null;
  const tradedAt = new Date(trade.traded_at);
  const images = trade.image_urls ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header
        c={c}
        styles={styles}
        router={router}
        t={t}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 通貨ペア + 方向 */}
        <View style={styles.titleRow}>
          <Text style={styles.pair}>{trade.currency_pair}</Text>
          {trade.source === 'mt5_import' && <VerifiedTradeBadge />}
          <View
            style={[
              styles.directionChip,
              {
                backgroundColor:
                  trade.direction === 'long'
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(239,68,68,0.15)',
              },
            ]}
          >
            <Text style={[styles.directionText, { color: directionColor }]}>
              {directionLabel}
            </Text>
          </View>
          {resultLabel && (
            <View
              style={[
                styles.resultChip,
                {
                  backgroundColor:
                    trade.result === 'win' ? c.win : c.loss,
                },
              ]}
            >
              <Text style={styles.resultText}>{resultLabel}</Text>
            </View>
          )}
        </View>

        {/* P&L カード */}
        <View style={styles.pnlCard}>
          <Text style={styles.cardLabel}>{t('tradeDetail.pnlLabel')}</Text>
          <Text
            style={[
              styles.pnlValue,
              {
                color:
                  trade.pnl === null || trade.pnl === 0
                    ? c.textPrimary
                    : trade.pnl > 0
                      ? c.win
                      : c.loss,
              },
            ]}
          >
            {trade.pnl !== null
              ? formatPnlWithCurrency(trade.pnl, currency)
              : '—'}
          </Text>
          {trade.pnl_pips !== null && (
            <Text
              style={[
                styles.pipsValue,
                {
                  color:
                    trade.pnl_pips === 0
                      ? c.textSecondary
                      : trade.pnl_pips > 0
                        ? c.win
                        : c.loss,
                },
              ]}
            >
              {trade.pnl_pips > 0 ? '+' : ''}
              {trade.pnl_pips.toFixed(1)} pips
            </Text>
          )}
        </View>

        {/* 詳細情報 */}
        <View style={styles.detailCard}>
          <DetailRow
            label={t('tradeDetail.dateLabel')}
            value={formatDate(tradedAt, locale)}
            c={c}
            isDark={isDark}
          />
          <DetailRow
            label={t('tradeDetail.timeLabel')}
            value={formatTime(tradedAt, locale)}
            c={c}
            isDark={isDark}
          />
          {trade.entry_price !== null && (
            <DetailRow
              label={t('tradeDetail.entryPrice')}
              value={String(trade.entry_price)}
              c={c}
              isDark={isDark}
            />
          )}
          {trade.exit_price !== null && (
            <DetailRow
              label={t('tradeDetail.exitPrice')}
              value={String(trade.exit_price)}
              c={c}
              isDark={isDark}
            />
          )}
          <DetailRow
            label={t('tradeDetail.lotSize')}
            value={String(trade.lot_size)}
            c={c}
            isDark={isDark}
            isLast={!trade.memo && images.length === 0}
          />
          {trade.memo && trade.memo.trim() !== '' && (
            <DetailRow
              label={t('tradeDetail.memoLabel')}
              value={trade.memo}
              c={c}
              isDark={isDark}
              isLast={images.length === 0}
              multiline
            />
          )}
        </View>

        {/* チャート画像 */}
        {images.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.sectionLabel}>
              {t('tradeDetail.imagesLabel')}
            </Text>
            <View style={styles.imagesRow}>
              {images.map((uri, i) => (
                <Pressable
                  key={uri + i}
                  onPress={() => setViewerIndex(i)}
                  style={({ pressed }) => [
                    styles.imageWrap,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.image}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <ImageViewer
          visible={viewerIndex !== null}
          uris={images}
          initialIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  c,
  styles,
  router,
  t,
  onEdit,
  onDelete,
}: {
  c: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  router: ReturnType<typeof useRouter>;
  t: (key: string, options?: Record<string, unknown>) => string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>{t('tradeDetail.title')}</Text>
      <View style={styles.headerActions}>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="create-outline" size={22} color={c.textPrimary} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={c.loss} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  c,
  isDark,
  isLast = false,
  multiline = false,
}: {
  label: string;
  value: string;
  c: ThemeColors;
  isDark: boolean;
  isLast?: boolean;
  multiline?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: multiline ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: multiline ? 'flex-start' : 'flex-start',
        paddingVertical: 12,
        gap: multiline ? 6 : 0,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: c.textSecondary,
          flex: multiline ? undefined : 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: c.textPrimary,
          flex: multiline ? undefined : 2,
          textAlign: multiline ? 'left' : 'right',
          fontWeight: '500',
          lineHeight: multiline ? 21 : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
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
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 60,
      justifyContent: 'flex-end',
    },
    headerIconBtn: {
      padding: 6,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notFound: {
      color: c.textSecondary,
      fontSize: 14,
    },
    body: {
      padding: 20,
      paddingBottom: 40,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
      flexWrap: 'wrap',
    },
    pair: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    directionChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    directionText: {
      fontSize: 13,
      fontWeight: '700',
    },
    resultChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    resultText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    pnlCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
      borderRadius: 14,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardLabel: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 6,
      fontWeight: '500',
    },
    pnlValue: {
      fontSize: 32,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    pipsValue: {
      fontSize: 14,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      marginTop: 4,
    },
    detailCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    imagesSection: {
      marginTop: 20,
    },
    sectionLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
      marginBottom: 10,
    },
    imagesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    imageWrap: {
      width: '48%',
      aspectRatio: 1.4,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.surfaceAlt,
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });
}
