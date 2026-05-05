import { useLocalSearchParams } from 'expo-router';
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
  Switch,
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
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { useToast } from '@/components/toast';
import { notifyError, notifySuccess } from '@/lib/haptics';
import { FREE_LIMITS, getPlan } from '@/lib/premium';
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
  isShared: false,
  imageUrls: [] as string[],
};

function parseInitialDate(raw: string | string[] | undefined): Date {
  if (typeof raw !== 'string' || !raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatTradedDate(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}

export default function RecordScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{ date?: string }>();
  const [form, setForm] = useState(initialState);
  const [tradedAt, setTradedAt] = useState<Date>(() =>
    parseInitialDate(params.date),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairSearch, setPairSearch] = useState('');

  // カレンダーから日付パラメータが渡されたら反映（URL変更時）
  useEffect(() => {
    if (typeof params.date === 'string' && params.date) {
      const d = new Date(params.date);
      if (!isNaN(d.getTime())) setTradedAt(d);
    }
  }, [params.date]);

  const entryPriceRef = useRef<TextInput>(null);
  const exitPriceRef = useRef<TextInput>(null);
  const lotSizeRef = useRef<TextInput>(null);
  const pnlRef = useRef<TextInput>(null);
  const pnlPipsRef = useRef<TextInput>(null);
  const { addTrade, trades } = useTrades();
  const { favorites, isFavorite, toggleFavorite } = useFavoritePairs();
  const { profile } = useProfile();
  const toast = useToast();
  const plan = getPlan(profile?.is_premium);

  // 今月の取引数（Free プラン制限用）
  const monthlyTradeCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return trades.filter((t) => new Date(t.traded_at) >= monthStart).length;
  }, [trades]);

  const isOverFreeLimit =
    plan === 'free' && monthlyTradeCount >= FREE_LIMITS.monthlyTrades;

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
      Alert.alert('画像追加に失敗', msg);
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

  const resetForm = () => setForm(initialState);

  const parseNum = parseNumOrNull;

  const handleSubmit = async () => {
    const entryPrice = parseNum(form.entryPrice);
    const lotSize = parseNum(form.lotSize);
    const exitPrice = parseNum(form.exitPrice);
    const pnl = applySignToNum(parseNum(form.pnl), form.result);
    const pnlPips = applySignToNum(parseNum(form.pnlPips), form.result);

    if (!form.currencyPair.trim()) {
      Alert.alert('入力エラー', '通貨ペアを入力してください。');
      return;
    }
    if (lotSize === null || lotSize <= 0) {
      Alert.alert('入力エラー', 'ロットサイズを正しく入力してください。');
      return;
    }
    if (isOverFreeLimit) {
      Alert.alert(
        'Free プランの上限',
        `Free プランでは月${FREE_LIMITS.monthlyTrades}件まで記録できます。\nPremium にアップグレードすると無制限になります。`,
      );
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        Alert.alert('認証エラー', `getUser失敗: ${userError.message}`);
        return;
      }

      const user = userData?.user;
      if (!user) {
        Alert.alert('エラー', 'ログインセッションが見つかりません。再度ログインしてください。');
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
        is_shared: form.isShared,
        image_urls: form.imageUrls,
        traded_at: tradedAt.toISOString(),
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('trades')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        Alert.alert(
          '保存失敗',
          `${insertError.message}\n\nコード: ${insertError.code ?? '不明'}\n詳細: ${
            insertError.details ?? 'なし'
          }`,
        );
        return;
      }

      if (insertedRow) {
        addTrade(insertedRow as Trade);
      }

      notifySuccess();
      toast.success('取引を記録しました');
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      notifyError();
      Alert.alert('予期せぬエラー', message);
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>取引記録</Text>
        <Text style={styles.subtitle}>今日のトレードを記録しましょう</Text>
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
            <Text style={styles.label}>取引日</Text>
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
                {formatTradedDate(tradedAt)}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === 'ios' && (
            <Modal
              transparent
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable
                style={styles.datePickerBackdrop}
                onPress={() => setShowDatePicker(false)}
              />
              <View style={styles.datePickerSheet}>
                <View style={styles.datePickerHeader}>
                  <Pressable onPress={() => setShowDatePicker(false)} hitSlop={12}>
                    <Text style={styles.datePickerDone}>完了</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tradedAt}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  themeVariant={c.background === '#fff' ? 'light' : 'dark'}
                  onChange={(_, selected) => {
                    if (selected) setTradedAt(selected);
                  }}
                />
              </View>
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
            <Text style={styles.label}>通貨ペア</Text>
            <TextInput
              style={styles.input}
              value={pairSearch}
              onChangeText={setPairSearch}
              placeholder="検索（例: USD, JPY, EUR）"
              placeholderTextColor={c.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            {form.currencyPair && (
              <Text style={styles.selectedPairText}>
                選択中: <Text style={styles.selectedPairValue}>{form.currencyPair}</Text>
              </Text>
            )}
            {!isSearching && favorites.length > 0 && (
              <Text style={styles.favHeader}>★ お気に入り</Text>
            )}
            <View style={[styles.chipsRow, styles.chipsRowMt]}>
              {visiblePairs.length === 0 ? (
                <Text style={styles.noMatchText}>
                  {isSearching
                    ? '該当する通貨ペアがありません'
                    : '検索欄に通貨を入力してください\n（★でお気に入り登録できます）'}
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
            <Text style={styles.label}>方向</Text>
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
                  ロング（買い）
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
                  ショート（売り）
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>結果</Text>
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
                disabled={loading}
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
              <Text style={styles.label}>エントリー価格（任意）</Text>
              <TextInput
                ref={entryPriceRef}
                style={styles.input}
                value={form.entryPrice}
                onChangeText={(t) => updatePriceField('entryPrice', t)}
                placeholder="例: 148.250"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => exitPriceRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>エグジット価格（任意）</Text>
              <TextInput
                ref={exitPriceRef}
                style={styles.input}
                value={form.exitPrice}
                onChangeText={(t) => updatePriceField('exitPrice', t)}
                placeholder="例: 148.800"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => lotSizeRef.current?.focus()}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>ロットサイズ</Text>
            <TextInput
              ref={lotSizeRef}
              style={styles.input}
              value={form.lotSize}
              onChangeText={(t) => setField('lotSize', t)}
              placeholder="例: 0.1"
              placeholderTextColor={c.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => pnlRef.current?.focus()}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>損益（円）</Text>
              <TextInput
                ref={pnlRef}
                style={styles.input}
                value={form.pnl}
                onChangeText={(t) => setField('pnl', t)}
                placeholder="例: 5500"
                placeholderTextColor={c.textSecondary}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                onSubmitEditing={() => pnlPipsRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>損益 pips</Text>
              <TextInput
                ref={pnlPipsRef}
                style={styles.input}
                value={form.pnlPips}
                onChangeText={(t) => setField('pnlPips', t)}
                placeholder="例: 55"
                placeholderTextColor={c.textSecondary}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.memo}
              onChangeText={(t) => setField('memo', t)}
              placeholder="取引の根拠、感想、振り返りなどを自由に記録"
              placeholderTextColor={c.textSecondary}
              multiline
              maxLength={1000}
              editable={!loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>チャート画像（任意・最大4枚）</Text>
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

          <View style={[styles.section, styles.switchRow]}>
            <View style={styles.flex}>
              <Text style={styles.label}>フィードに共有</Text>
              <Text style={styles.helperText}>オンにするとタイムラインに表示されます</Text>
            </View>
            <Switch
              value={form.isShared}
              onValueChange={(v) => setField('isShared', v)}
              trackColor={{ false: c.border, true: c.accent }}
              thumbColor="#fff"
              disabled={loading}
            />
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
              <Text style={styles.submitButtonText}>保存</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  datePickerSheet: {
    backgroundColor: c.surface,
    paddingBottom: 24,
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
  selectedPairText: {
    marginTop: 10,
    fontSize: 12,
    color: c.textSecondary,
  },
  selectedPairValue: {
    color: c.accent,
    fontWeight: '700',
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 10,
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
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddButton: {
    width: 72,
    height: 72,
    borderRadius: 10,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
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
