import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useFavoritePairs } from '@/hooks/use-favorite-pairs';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { useToast } from '@/components/toast';
import { formatDate, pickerLocale } from '@/lib/format-date';
import { AnalyticsEvents } from '@/lib/analytics';
import { notifyError, notifySuccess } from '@/lib/haptics';
import { checkRatingPrompt } from '@/lib/rating';
import { PLAN_LIMITS, getPlan } from '@/lib/premium';
import { supabase } from '@/lib/supabase';
import {
  applySignToNum,
  applySignToString,
  parseNumOrNull,
  recalcPipsField,
} from '@/lib/trade-math';
import { pickAndUploadImage } from '@/lib/upload-image';
import {
  ALL_CURRENCY_PAIRS,
  Trade,
  TradeDirection,
  TradeInsert,
  TradeResult,
} from '@/lib/types';

const initialState = {
  currencyPair: 'USD/JPY',
  direction: 'long' as TradeDirection,
  result: null as TradeResult | null,
  entryPrice: '',
  exitPrice: '',
  lotSize: '',
  pnl: '',
  pnlPips: '',
  memo: '',
  imageUrls: [] as string[],
  tags: [] as string[],
};

function parseInitialDate(raw: string | string[] | undefined): Date {
  if (typeof raw !== 'string' || !raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default function RecordScreen() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [form, setForm] = useState(initialState);
  const [tradedAt, setTradedAt] = useState<Date>(() =>
    parseInitialDate(params.date),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [tiltDismissed, setTiltDismissed] = useState(false);

  // カレンダーから日付パラメータが渡されたら反映（URL変更時）
  useEffect(() => {
    if (typeof params.date === 'string' && params.date) {
      const d = new Date(params.date);
      if (!isNaN(d.getTime())) setTradedAt(d);
    }
  }, [params.date]);

  const pairSearchRef = useRef<TextInput>(null);
  const entryPriceRef = useRef<TextInput>(null);
  const exitPriceRef = useRef<TextInput>(null);
  const lotSizeRef = useRef<TextInput>(null);
  const pnlRef = useRef<TextInput>(null);
  const pnlPipsRef = useRef<TextInput>(null);
  const memoRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { addTrade, trades } = useTrades();
  const { favorites, isFavorite, toggleFavorite } = useFavoritePairs();
  const { profile } = useProfile();
  const toast = useToast();
  const plan = getPlan(profile?.plan_tier, profile?.bonus_premium_until);

  // 今月の取引数（プラン別の月間制限用）
  const monthlyTradeCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return trades.filter((t) => new Date(t.traded_at) >= monthStart).length;
  }, [trades]);

  const monthlyLimit = PLAN_LIMITS[plan].monthlyTrades;
  const isOverFreeLimit = monthlyTradeCount >= monthlyLimit;

  // 連敗ティルト検知: 直近の取引から連続する負けを数える
  const lossStreak = useMemo(() => {
    const sorted = trades
      .filter((tr) => tr.result !== null)
      .sort(
        (a, b) =>
          new Date(b.traded_at).getTime() - new Date(a.traded_at).getTime(),
      );
    let n = 0;
    for (const tr of sorted) {
      if (tr.result === 'loss') n += 1;
      else break;
    }
    return n;
  }, [trades]);
  const showTilt = lossStreak >= 3 && !tiltDismissed;

  const [uploadingImage, setUploadingImage] = useState(false);

  const addImage = async () => {
    if (uploadingImage || form.imageUrls.length >= 4) return;
    setUploadingImage(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? 'anon';
      const url = await pickAndUploadImage({
        bucket: 'trade-images',
        pathPrefix: `${userId}/trade`,
      });
      if (url) {
        setField('imageUrls', [...form.imageUrls, url]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('record.addImageFail'), msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (idx: number) => {
    setField(
      'imageUrls',
      form.imageUrls.filter((_, i) => i !== idx),
    );
  };

  const isSearching = pairSearch.trim() !== '';

  const visiblePairs = useMemo(() => {
    const q = pairSearch.trim().toUpperCase();
    if (q === '') {
      // 検索が空のときは常にお気に入りだけを表示
      // お気に入りから外せばリストから消える
      return ALL_CURRENCY_PAIRS.filter((p) => favorites.includes(p));
    }
    return ALL_CURRENCY_PAIRS.filter((p) => p.includes(q));
  }, [pairSearch, favorites]);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePriceField = (key: 'entryPrice' | 'exitPrice', value: string) => {
    setForm((prev) => recalcPipsField({ ...prev, [key]: value }));
  };

  const updateDirection = (direction: TradeDirection) => {
    setForm((prev) => recalcPipsField({ ...prev, direction }));
  };

  const updateCurrencyPair = (currencyPair: string) => {
    setForm((prev) => recalcPipsField({ ...prev, currencyPair }));
    setPairSearch('');
  };

  const resetForm = () => {
    setForm(initialState);
  };

  const parseNum = parseNumOrNull;

  const handleSubmit = async () => {
    const entryPrice = parseNum(form.entryPrice);
    const lotSize = parseNum(form.lotSize);
    const exitPrice = parseNum(form.exitPrice);
    const pnl = applySignToNum(parseNum(form.pnl), form.result);
    const pnlPips = applySignToNum(parseNum(form.pnlPips), form.result);

    if (!form.currencyPair.trim()) {
      Alert.alert(t('record.inputErrorTitle'), t('record.inputErrorPair'));
      return;
    }
    if (lotSize === null || lotSize <= 0) {
      Alert.alert(t('record.inputErrorTitle'), t('record.inputErrorLot'));
      return;
    }
    if (isOverFreeLimit) {
      Alert.alert(
        t('record.freePlanLimit'),
        t('record.freeLimitBody', { count: monthlyLimit }),
      );
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        Alert.alert(t('record.authError'), `getUser: ${userError.message}`);
        return;
      }

      const user = userData?.user;
      if (!user) {
        Alert.alert(t('record.genericError'), t('record.sessionNotFound'));
        return;
      }

      const payload: TradeInsert & { user_id: string } = {
        user_id: user.id,
        currency_pair: form.currencyPair.trim(),
        direction: form.direction,
        result: form.result,
        entry_price: entryPrice,
        exit_price: exitPrice,
        lot_size: lotSize,
        pnl,
        pnl_pips: pnlPips,
        memo: form.memo.trim() || null,
        post_memo: null,
        review_memo: null,
        is_shared: false,
        image_urls: form.imageUrls,
        tags: form.tags,
        traded_at: tradedAt.toISOString(),
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('trades')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        Alert.alert(
          t('record.saveFail'),
          `${insertError.message}\n\n${insertError.code ?? ''}${
            insertError.details ? `\n${insertError.details}` : ''
          }`,
        );
        return;
      }

      if (insertedRow) {
        addTrade(insertedRow as Trade);
      }

      AnalyticsEvents.tradeRecorded(payload.currency_pair, payload.pnl ?? 0);
      notifySuccess();
      toast.success(t('record.saveSuccess'));
      resetForm();
      checkRatingPrompt();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      notifyError();
      Alert.alert(t('record.unexpectedError'), message);
    } finally {
      setLoading(false);
    }
  };

  const toggleResult = (value: TradeResult) => {
    const newResult = form.result === value ? null : value;
    setForm((prev) => {
      if (newResult === null) {
        return { ...prev, result: null };
      }
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
    // 結果選択後にエントリー価格にフォーカス
    if (newResult !== null) {
      setTimeout(() => entryPriceRef.current?.focus(), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{t('record.title')}</Text>
          <Text style={styles.subtitle}>{t('record.subtitle')}</Text>
          <Pressable
            onPress={() => plan !== 'pro' && router.push('/premium')}
            disabled={plan === 'pro'}
            style={[
              styles.quotaChip,
              {
                backgroundColor: isOverFreeLimit ? `${c.loss}1A` : `${c.accent}14`,
              },
            ]}
          >
            <Ionicons
              name={plan === 'pro' ? 'infinite' : 'document-text-outline'}
              size={12}
              color={isOverFreeLimit ? c.loss : c.accent}
            />
            <Text
              style={[
                styles.quotaText,
                { color: isOverFreeLimit ? c.loss : c.accent },
              ]}
            >
              {plan === 'pro'
                ? t('record.quotaUnlimited', { count: monthlyTradeCount })
                : t('record.quota', {
                    count: monthlyTradeCount,
                    limit: monthlyLimit,
                  })}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/import-trades')}
          style={({ pressed }) => [
            styles.importButton,
            pressed && styles.importButtonPressed,
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={c.accent} />
          <Text style={styles.importButtonText}>{t('record.importMt5')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          bounces={false}
        >
          {showTilt && (
            <View style={styles.tiltBanner}>
              <Ionicons name="warning-outline" size={20} color={c.loss} />
              <View style={styles.flex}>
                <Text style={styles.tiltTitle}>
                  {t('record.tiltTitle', { count: lossStreak })}
                </Text>
                <Text style={styles.tiltBody}>{t('record.tiltBody')}</Text>
              </View>
              <Pressable onPress={() => setTiltDismissed(true)} hitSlop={10}>
                <Ionicons name="close" size={18} color={c.textSecondary} />
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.dateLabel')}</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
              style={({ pressed }) => [
                styles.dateField,
                pressed && styles.dateFieldPressed,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={c.textSecondary}
              />
              <Text style={styles.dateFieldText}>
                {formatDate(tradedAt, locale)}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === 'ios' && (
            <Modal
              transparent
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable
                style={styles.datePickerBackdrop}
                onPress={() => setShowDatePicker(false)}
              >
                <Pressable
                  style={styles.datePickerSheet}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.datePickerHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)} hitSlop={12}>
                      <Text style={styles.datePickerDone}>{t('record.doneButton')}</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={tradedAt}
                    mode="date"
                    display="inline"
                    locale={pickerLocale(locale)}
                    maximumDate={new Date()}
                    themeVariant={c.background === '#FFFFFF' ? 'light' : 'dark'}
                    accentColor={c.accent}
                    onChange={(_, selected) => {
                      if (selected) setTradedAt(selected);
                    }}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={tradedAt}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selected) setTradedAt(selected);
              }}
            />
          )}

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.pairLabel')}</Text>

            {form.currencyPair ? (
              // カード全体をタップしても選び直せる（バグ#9）。x ボタンは従来通り。
              <Pressable
                onPress={() => {
                  updateCurrencyPair('');
                  setPairSearch('');
                  setTimeout(() => pairSearchRef.current?.focus(), 50);
                }}
                style={styles.selectedPairCard}
              >
                <Text style={styles.selectedPairCardText}>
                  {form.currencyPair}
                </Text>
                <View style={styles.selectedPairClear}>
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={c.textSecondary}
                  />
                </View>
              </Pressable>
            ) : (
              <TextInput
                ref={pairSearchRef}
                style={styles.input}
                value={pairSearch}
                onChangeText={setPairSearch}
                placeholder={t('record.pairSearchPlaceholder')}
                placeholderTextColor={c.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => entryPriceRef.current?.focus()}
                editable={!loading}
              />
            )}

            {!isSearching && !form.currencyPair && favorites.length > 0 && (
              <Text style={styles.favHeader}>{t('record.favHeader')}</Text>
            )}
            <View style={[styles.chipsRow, styles.chipsRowMt]}>
              {visiblePairs.length === 0 ? (
                <Text style={styles.noMatchText}>
                  {isSearching
                    ? t('record.noMatchingPair')
                    : t('record.pairSearchHint')}
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
                        style={[styles.chipText, selected && styles.chipTextSelected]}
                      >
                        {pair}
                      </Text>
                      <Pressable
                        onPress={() => toggleFavorite(pair)}
                        hitSlop={6}
                        style={styles.starWrap}
                      >
                        <Text
                          style={[
                            styles.starIcon,
                            fav && styles.starIconActive,
                          ]}
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
                disabled={loading}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.direction === 'long' && styles.segmentTextActive,
                  ]}
                >
                  {t('record.long')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentItem,
                  form.direction === 'short' && styles.segmentItemActive,
                ]}
                onPress={() => updateDirection('short')}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.direction === 'short' && styles.segmentTextActive,
                  ]}
                >
                  {t('record.short')}
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
                disabled={loading}
              >
                <Text
                  style={[
                    styles.resultButtonText,
                    { color: c.win },
                    form.result === 'win' && styles.resultButtonTextSelected,
                  ]}
                >
                  {t('record.win')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.resultButton,
                  styles.resultButtonLoss,
                  form.result === 'loss' && styles.resultButtonLossSelected,
                ]}
                onPress={() => toggleResult('loss')}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.resultButtonText,
                    { color: c.loss },
                    form.result === 'loss' && styles.resultButtonTextSelected,
                  ]}
                >
                  {t('record.loss')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.entryPriceLabel')}</Text>
              <TextInput
                ref={entryPriceRef}
                style={styles.input}
                value={form.entryPrice}
                onChangeText={(t) => updatePriceField('entryPrice', t)}
                placeholder={t('record.entryPriceExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => exitPriceRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.exitPriceLabel')}</Text>
              <TextInput
                ref={exitPriceRef}
                style={styles.input}
                value={form.exitPrice}
                onChangeText={(t) => updatePriceField('exitPrice', t)}
                placeholder={t('record.exitPriceExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => lotSizeRef.current?.focus()}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.lotLabel')}</Text>
            <TextInput
              ref={lotSizeRef}
              style={styles.input}
              value={form.lotSize}
              onChangeText={(t) => setField('lotSize', t)}
              placeholder={t('record.lotExample')}
              placeholderTextColor={c.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => pnlRef.current?.focus()}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.pnlLabel')}</Text>
              <TextInput
                ref={pnlRef}
                style={styles.input}
                value={form.pnl}
                onChangeText={(t) => setField('pnl', t)}
                placeholder={t('record.pnlExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => pnlPipsRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>{t('record.pipsLabel')}</Text>
              <TextInput
                ref={pnlPipsRef}
                style={styles.input}
                value={form.pnlPips}
                onChangeText={(t) => setField('pnlPips', t)}
                placeholder={t('record.pipsExample')}
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => memoRef.current?.focus()}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.memoLabel')}</Text>
            <TextInput
              ref={memoRef}
              style={[styles.input, styles.inputMultiline]}
              value={form.memo}
              onChangeText={(t) => setField('memo', t)}
              onFocus={() =>
                setTimeout(
                  () => scrollRef.current?.scrollToEnd({ animated: true }),
                  120,
                )
              }
              placeholder={t('record.memoPlaceholder')}
              placeholderTextColor={c.textSecondary}
              keyboardType="default"
              returnKeyType="done"
              multiline
              maxLength={1000}
              editable={!loading}
            />
          </View>

          {/* 手法タグはフォームから削除（編集画面から後で付与可能）。tags は空配列で保存される。 */}

          <View style={styles.section}>
            <Text style={styles.label}>{t('record.imagesLabel')}</Text>
            <View style={styles.imageRow}>
              {form.imageUrls.map((uri, i) => (
                <View key={uri} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.imageThumbImg} contentFit="cover" />
                  <Pressable
                    onPress={() => removeImage(i)}
                    hitSlop={6}
                    style={styles.imageRemove}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {form.imageUrls.length < 4 && (
                <Pressable
                  onPress={addImage}
                  disabled={uploadingImage || loading}
                  style={({ pressed }) => [
                    styles.imageAddButton,
                    pressed && styles.imageAddButtonPressed,
                    uploadingImage && styles.imageAddButtonDisabled,
                  ]}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={c.textSecondary} />
                  ) : (
                    <Ionicons name="add" size={32} color={c.textSecondary} />
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              loading && styles.submitButtonDisabled,
              pressed && !loading && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('record.save')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.surface,
  },
  importButtonPressed: {
    opacity: 0.7,
  },
  importButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 4,
  },
  quotaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 8,
  },
  quotaText: { fontSize: 12, fontWeight: '700' },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  tiltBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.loss + '18',
    borderWidth: 1,
    borderColor: c.loss + '55',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  tiltTitle: { fontSize: 14, fontWeight: '700', color: c.loss },
  tiltBody: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.textPrimary,
  },
  inputMt: {
    marginTop: 8,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateFieldPressed: {
    opacity: 0.7,
  },
  dateFieldText: {
    fontSize: 16,
    color: c.textPrimary,
    fontWeight: '500',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  datePickerSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    paddingBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '700',
    color: c.accent,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsRowMt: {
    marginTop: 12,
  },
  selectedPairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  selectedPairCardText: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: 1,
  },
  selectedPairClear: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  noMatchText: {
    fontSize: 13,
    color: c.textSecondary,
    paddingVertical: 8,
  },
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
  favHeader: {
    marginTop: 14,
    fontSize: 12,
    color: c.star,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  starWrap: {
    marginLeft: 6,
  },
  starIcon: {
    fontSize: 14,
    color: c.textSecondary,
  },
  starIconActive: {
    color: c.star,
  },
  chipSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  tagChipSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  tagChipText: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  tagAddButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAddButtonDisabled: {
    opacity: 0.5,
  },
  tagAddButtonPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: c.surfaceAlt,
  },
  segmentText: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: c.textPrimary,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 2,
  },
  resultButtonWin: {
    borderColor: c.win,
  },
  resultButtonWinSelected: {
    backgroundColor: c.win,
    borderColor: c.win,
  },
  resultButtonLoss: {
    borderColor: c.loss,
  },
  resultButtonLossSelected: {
    backgroundColor: c.loss,
    borderColor: c.loss,
  },
  resultButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultButtonTextSelected: {
    color: '#fff',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageThumb: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
  },
  imageThumbImg: {
    width: '100%',
    height: '100%',
  },
  imageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  imageAddButtonPressed: {
    opacity: 0.7,
  },
  imageAddButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  });
}
