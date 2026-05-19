import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useFavoritePairs } from '@/hooks/use-favorite-pairs';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { supabase } from '@/lib/supabase';
import {
  applySignToNum,
  applySignToString,
  parseNumOrNull,
  recalcPipsField,
} from '@/lib/trade-math';
import {
  ALL_CURRENCY_PAIRS,
  Trade,
  TradeDirection,
  TradeResult,
} from '@/lib/types';

type FormState = {
  currencyPair: string;
  direction: TradeDirection;
  result: TradeResult | null;
  entryPrice: string;
  exitPrice: string;
  lotSize: string;
  pnl: string;
  pnlPips: string;
  memo: string;
  isShared: boolean;
};

function tradeToForm(t: Trade): FormState {
  // 旧データ（post_memo / review_memo）が残っている場合は memo に統合表示
  const merged = [t.memo, t.post_memo, t.review_memo]
    .filter((s) => s && s.trim() !== '')
    .join('\n\n');
  return {
    currencyPair: t.currency_pair,
    direction: t.direction,
    result: t.result,
    entryPrice: t.entry_price !== null ? String(t.entry_price) : '',
    exitPrice: t.exit_price !== null ? String(t.exit_price) : '',
    lotSize: String(t.lot_size),
    pnl: t.pnl !== null ? String(t.pnl) : '',
    pnlPips: t.pnl_pips !== null ? String(t.pnl_pips) : '',
    memo: merged,
    isShared: t.is_shared,
  };
}

export default function TradeEditScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trades, refresh } = useTrades();
  const { favorites, isFavorite, toggleFavorite } = useFavoritePairs();

  const original = trades.find((t) => t.id === id) ?? null;
  const [form, setForm] = useState<FormState | null>(
    original ? tradeToForm(original) : null,
  );
  const [pairSearch, setPairSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // 取引が context 未取得の場合に直接フェッチ
  useEffect(() => {
    if (!form && id) {
      (async () => {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) setForm(tradeToForm(data as Trade));
      })();
    }
  }, [form, id]);

  const isSearching = pairSearch.trim() !== '';
  const visiblePairs = useMemo(() => {
    const q = pairSearch.trim().toUpperCase();
    if (q === '') {
      return ALL_CURRENCY_PAIRS.filter((p) => favorites.includes(p));
    }
    return ALL_CURRENCY_PAIRS.filter((p) => p.includes(q));
  }, [pairSearch, favorites]);

  if (!form) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('record.editTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updatePriceField = (
    key: 'entryPrice' | 'exitPrice',
    value: string,
  ) => {
    setForm((prev) => (prev ? recalcPipsField({ ...prev, [key]: value }) : prev));
  };

  const updateDirection = (direction: TradeDirection) => {
    setForm((prev) => (prev ? recalcPipsField({ ...prev, direction }) : prev));
  };

  const updateCurrencyPair = (currencyPair: string) => {
    setForm((prev) => (prev ? recalcPipsField({ ...prev, currencyPair }) : prev));
    setPairSearch('');
  };

  const toggleResult = (value: TradeResult) => {
    setForm((prev) => {
      if (!prev) return prev;
      const newResult = prev.result === value ? null : value;
      if (newResult === null) return { ...prev, result: null };
      const hasMathPips =
        parseNumOrNull(prev.entryPrice) !== null &&
        parseNumOrNull(prev.exitPrice) !== null;
      return {
        ...prev,
        result: newResult,
        pnl: applySignToString(prev.pnl, newResult),
        pnlPips: hasMathPips
          ? prev.pnlPips
          : applySignToString(prev.pnlPips, newResult),
      };
    });
  };

  const handleSave = async () => {
    if (!form || !id) return;
    const lotSize = parseNumOrNull(form.lotSize);
    if (!form.currencyPair.trim()) {
      Alert.alert(t('record.inputErrorTitle'), t('record.inputErrorPair'));
      return;
    }
    if (lotSize === null || lotSize <= 0) {
      Alert.alert(t('record.inputErrorTitle'), t('record.inputErrorLot'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('trades')
        .update({
          currency_pair: form.currencyPair.trim(),
          direction: form.direction,
          result: form.result,
          entry_price: parseNumOrNull(form.entryPrice),
          exit_price: parseNumOrNull(form.exitPrice),
          lot_size: lotSize,
          pnl: applySignToNum(parseNumOrNull(form.pnl), form.result),
          pnl_pips: applySignToNum(parseNumOrNull(form.pnlPips), form.result),
          memo: form.memo.trim() || null,
          post_memo: null,
          review_memo: null,
          is_shared: form.isShared,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
      await refresh();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('record.saveFail'), msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={saving} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('record.editTitle')}</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Text style={[styles.headerLink, styles.saveLink]}>{t('record.save')}</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.section}>
            <Text style={styles.label}>{t('record.pairLabel')}</Text>
            <TextInput
              style={styles.input}
              value={pairSearch}
              onChangeText={setPairSearch}
              placeholder={t('record.pairSearchPlaceholder')}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.selectedPairText}>
              選択中: <Text style={styles.selectedPairValue}>{form.currencyPair}</Text>
            </Text>
            {!isSearching && favorites.length > 0 && (
              <Text style={styles.favHeader}>{t('record.favHeader')}</Text>
            )}
            <View style={[styles.chipsRow, styles.chipsRowMt]}>
              {visiblePairs.length === 0 ? (
                <Text style={styles.noMatchText}>
                  {isSearching
                    ? t('record.noMatchingPair')
                    : t('record.pairSearchHintShort')}
                </Text>
              ) : (
                visiblePairs.map((pair) => {
                  const selected = form.currencyPair === pair;
                  const fav = isFavorite(pair);
                  return (
                    <Pressable
                      key={pair}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => updateCurrencyPair(pair)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {pair}
                      </Text>
                      <Pressable
                        onPress={() => toggleFavorite(pair)}
                        hitSlop={6}
                      >
                        <Text
                          style={[styles.starIcon, fav && styles.starIconActive]}
                        >
                          {fav ? '★' : '☆'}
                        </Text>
                      </Pressable>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.directionLabel')}</Text>
            <View style={styles.segment}>
              <Pressable
                style={[
                  styles.segmentItem,
                  form.direction === 'long' && styles.segmentItemActive,
                ]}
                onPress={() => updateDirection('long')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.direction === 'long' && styles.segmentTextActive,
                  ]}
                >
                  ロング（買い）
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentItem,
                  form.direction === 'short' && styles.segmentItemActive,
                ]}
                onPress={() => updateDirection('short')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.direction === 'short' && styles.segmentTextActive,
                  ]}
                >
                  ショート（売り）
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.resultLabel')}</Text>
            <View style={styles.resultRow}>
              <Pressable
                style={[
                  styles.resultButton,
                  styles.resultButtonWin,
                  form.result === 'win' && styles.resultButtonWinSelected,
                ]}
                onPress={() => toggleResult('win')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.resultButtonText,
                    { color: c.win },
                    form.result === 'win' && styles.resultButtonTextSelected,
                  ]}
                >
                  利確
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.resultButton,
                  styles.resultButtonLoss,
                  form.result === 'loss' && styles.resultButtonLossSelected,
                ]}
                onPress={() => toggleResult('loss')}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.resultButtonText,
                    { color: c.loss },
                    form.result === 'loss' && styles.resultButtonTextSelected,
                  ]}
                >
                  損切り
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.entryPriceLabel')}</Text>
              <TextInput
                style={styles.input}
                value={form.entryPrice}
                onChangeText={(t) => updatePriceField('entryPrice', t)}
                placeholder={t('record.entryPriceExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.exitPriceLabel')}</Text>
              <TextInput
                style={styles.input}
                value={form.exitPrice}
                onChangeText={(t) => updatePriceField('exitPrice', t)}
                placeholder={t('record.exitPriceExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.lotLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.lotSize}
              onChangeText={(t) => setField('lotSize', t)}
              placeholder={t('record.lotExample')}
              placeholderTextColor={c.textSecondary}
              keyboardType="decimal-pad"
              editable={!saving}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.pnlLabel')}</Text>
              <TextInput
                style={styles.input}
                value={form.pnl}
                onChangeText={(t) => setField('pnl', t)}
                placeholder={t('record.pnlExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="numbers-and-punctuation"
                editable={!saving}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.pipsLabel')}</Text>
              <TextInput
                style={styles.input}
                value={form.pnlPips}
                onChangeText={(t) => setField('pnlPips', t)}
                placeholder={t('record.pipsExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="numbers-and-punctuation"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.memoLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.memo}
              onChangeText={(t) => setField('memo', t)}
              placeholder={t('record.memoPlaceholder')}
              placeholderTextColor={c.textSecondary}
              multiline
              maxLength={1000}
              editable={!saving}
            />
          </View>

          <View style={[styles.section, styles.switchRow]}>
            <View style={styles.flex}>
              <Text style={styles.label}>{t('record.shareFeedLabel')}</Text>
              <Text style={styles.helperText}>{t('record.shareFeedShortHelp')}</Text>
            </View>
            <Switch
              value={form.isShared}
              onValueChange={(v) => setField('isShared', v)}
              trackColor={{ false: c.border, true: c.accent }}
              thumbColor="#fff"
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: { fontSize: 15, color: c.textSecondary },
    saveLink: { color: c.accent, fontWeight: '700' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 56 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 20, paddingBottom: 40 },
    section: { marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12 },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: 8,
    },
    helperText: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.textPrimary,
    },
    inputMultiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipsRowMt: { marginTop: 12 },
    selectedPairText: { marginTop: 10, fontSize: 12, color: c.textSecondary },
    selectedPairValue: { color: c.accent, fontWeight: '700' },
    favHeader: {
      marginTop: 14,
      fontSize: 12,
      color: c.star,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    noMatchText: { fontSize: 13, color: c.textSecondary, paddingVertical: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipSelected: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontSize: 13, color: c.textPrimary, fontWeight: '500' },
    chipTextSelected: { color: '#fff', fontWeight: '600' },
    starIcon: { fontSize: 14, color: c.textSecondary, marginLeft: 6 },
    starIconActive: { color: c.star },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 6,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 4,
      alignItems: 'center',
    },
    segmentItemActive: { backgroundColor: c.surfaceAlt },
    segmentText: { fontSize: 14, color: c.textSecondary, fontWeight: '500' },
    segmentTextActive: { color: c.textPrimary, fontWeight: '600' },
    resultRow: { flexDirection: 'row', gap: 12 },
    resultButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 2,
    },
    resultButtonWin: { borderColor: c.win },
    resultButtonWinSelected: { backgroundColor: c.win, borderColor: c.win },
    resultButtonLoss: { borderColor: c.loss },
    resultButtonLossSelected: { backgroundColor: c.loss, borderColor: c.loss },
    resultButtonText: { fontSize: 15, fontWeight: '700' },
    resultButtonTextSelected: { color: '#fff' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      padding: 16,
      marginBottom: 24,
    },
  });
}
