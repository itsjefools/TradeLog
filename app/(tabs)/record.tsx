import { useState } from 'react';
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

import { supabase } from '@/lib/supabase';
import { COMMON_CURRENCY_PAIRS, TradeDirection, TradeInsert, TradeResult } from '@/lib/types';

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const SURFACE = '#1E293B';
const SURFACE_ALT = '#273449';
const BORDER = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_SECONDARY = '#94A3B8';
const WIN_COLOR = '#10B981';
const LOSS_COLOR = '#EF4444';

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
};

export default function RecordScreen() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => setForm(initialState);

  const parseNum = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async () => {
    const entryPrice = parseNum(form.entryPrice);
    const lotSize = parseNum(form.lotSize);
    const exitPrice = parseNum(form.exitPrice);
    const pnl = parseNum(form.pnl);
    const pnlPips = parseNum(form.pnlPips);

    if (!form.currencyPair.trim()) {
      Alert.alert('入力エラー', '通貨ペアを入力してください。');
      return;
    }
    if (lotSize === null || lotSize <= 0) {
      Alert.alert('入力エラー', 'ロットサイズを正しく入力してください。');
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
        is_shared: form.isShared,
      };

      const { error: insertError } = await supabase.from('trades').insert(payload);

      if (insertError) {
        Alert.alert(
          '保存失敗',
          `${insertError.message}\n\nコード: ${insertError.code ?? '不明'}\n詳細: ${
            insertError.details ?? 'なし'
          }`,
        );
        return;
      }

      Alert.alert('保存しました', '取引を記録しました。', [
        { text: 'OK', onPress: resetForm },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('予期せぬエラー', message);
    } finally {
      setLoading(false);
    }
  };

  const toggleResult = (value: TradeResult) => {
    setField('result', form.result === value ? null : value);
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
        >
          <View style={styles.section}>
            <Text style={styles.label}>通貨ペア</Text>
            <View style={styles.chipsRow}>
              {COMMON_CURRENCY_PAIRS.map((pair) => {
                const selected = form.currencyPair === pair;
                return (
                  <Pressable
                    key={pair}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setField('currencyPair', pair)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {pair}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, styles.inputMt]}
              value={form.currencyPair}
              onChangeText={(t) => setField('currencyPair', t)}
              placeholder="その他 (例: CHF/JPY)"
              placeholderTextColor={TEXT_SECONDARY}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>方向</Text>
            <View style={styles.segment}>
              <Pressable
                style={[
                  styles.segmentItem,
                  form.direction === 'long' && styles.segmentItemActive,
                ]}
                onPress={() => setField('direction', 'long')}
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
                onPress={() => setField('direction', 'short')}
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
                    { color: WIN_COLOR },
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
                    { color: LOSS_COLOR },
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
                style={styles.input}
                value={form.entryPrice}
                onChangeText={(t) => setField('entryPrice', t)}
                placeholder="例: 148.250"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>エグジット価格（任意）</Text>
              <TextInput
                style={styles.input}
                value={form.exitPrice}
                onChangeText={(t) => setField('exitPrice', t)}
                placeholder="例: 148.800"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>ロットサイズ</Text>
            <TextInput
              style={styles.input}
              value={form.lotSize}
              onChangeText={(t) => setField('lotSize', t)}
              placeholder="例: 0.1"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>損益（円）</Text>
              <TextInput
                style={styles.input}
                value={form.pnl}
                onChangeText={(t) => setField('pnl', t)}
                placeholder="例: 5500"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="numbers-and-punctuation"
                editable={!loading}
              />
            </View>
            <View style={[styles.section, styles.flex]}>
              <Text style={styles.label}>損益 pips</Text>
              <TextInput
                style={styles.input}
                value={form.pnlPips}
                onChangeText={(t) => setField('pnlPips', t)}
                placeholder="例: 55"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="numbers-and-punctuation"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>メモ（取引の根拠など）</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.memo}
              onChangeText={(t) => setField('memo', t)}
              placeholder="例: ロンドン時間の押し目買い。移動平均線でサポート確認。"
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={4}
              editable={!loading}
            />
          </View>

          <View style={[styles.section, styles.switchRow]}>
            <View style={styles.flex}>
              <Text style={styles.label}>フィードに共有</Text>
              <Text style={styles.helperText}>オンにするとタイムラインに表示されます</Text>
            </View>
            <Switch
              value={form.isShared}
              onValueChange={(v) => setField('isShared', v)}
              trackColor={{ false: BORDER, true: ACCENT }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  inputMt: {
    marginTop: 8,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: SURFACE_ALT,
  },
  segmentText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: TEXT_PRIMARY,
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
    backgroundColor: SURFACE,
    borderWidth: 2,
  },
  resultButtonWin: {
    borderColor: WIN_COLOR,
  },
  resultButtonWinSelected: {
    backgroundColor: WIN_COLOR,
    borderColor: WIN_COLOR,
  },
  resultButtonLoss: {
    borderColor: LOSS_COLOR,
  },
  resultButtonLossSelected: {
    backgroundColor: LOSS_COLOR,
    borderColor: LOSS_COLOR,
  },
  resultButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultButtonTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: ACCENT,
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
