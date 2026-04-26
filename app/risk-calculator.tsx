import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';

export default function RiskCalculatorScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const [balance, setBalance] = useState('1000000');
  const [riskPct, setRiskPct] = useState('2');
  const [stopPips, setStopPips] = useState('30');
  const [pipValue, setPipValue] = useState('1000'); // 1ロットあたり1pipの円換算（JPYペア=1000円）

  const result = useMemo(() => {
    const b = Number(balance);
    const r = Number(riskPct);
    const s = Number(stopPips);
    const p = Number(pipValue);
    if (!Number.isFinite(b) || !Number.isFinite(r) || !Number.isFinite(s) || !Number.isFinite(p)) {
      return null;
    }
    if (b <= 0 || r <= 0 || s <= 0 || p <= 0) return null;
    const riskAmount = (b * r) / 100;
    const lots = riskAmount / (s * p);
    const tenK = lots * 10; // 1ロット = 10万通貨 = 10万通貨 / 1万通貨 = 10万通貨ロット
    const fineLots = Math.floor(lots * 100) / 100;
    return {
      riskAmount,
      lots,
      tenK,
      fineLots,
    };
  }, [balance, riskPct, stopPips, pipValue]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>リスク計算機</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            残高・リスク%・損切り幅から、適正なロットサイズを計算します。
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>口座残高（円）</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numbers-and-punctuation"
              placeholder="例: 1000000"
              placeholderTextColor={c.textSecondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>リスク (%)</Text>
            <TextInput
              style={styles.input}
              value={riskPct}
              onChangeText={setRiskPct}
              keyboardType="decimal-pad"
              placeholder="例: 2"
              placeholderTextColor={c.textSecondary}
            />
            <Text style={styles.helper}>1取引あたり許容できる損失の割合（推奨1〜2%）</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>損切り幅（pips）</Text>
            <TextInput
              style={styles.input}
              value={stopPips}
              onChangeText={setStopPips}
              keyboardType="decimal-pad"
              placeholder="例: 30"
              placeholderTextColor={c.textSecondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>1ロットあたり1pipの円換算</Text>
            <View style={styles.presetRow}>
              {[
                { label: 'JPY建て (例: USD/JPY)', value: '1000' },
                { label: 'USD建て (約)', value: '1500' },
                { label: 'カスタム', value: '' },
              ].map((p) => (
                <Pressable
                  key={p.label}
                  onPress={() => p.value && setPipValue(p.value)}
                  style={[
                    styles.preset,
                    pipValue === p.value && styles.presetActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      pipValue === p.value && styles.presetTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.inputMt]}
              value={pipValue}
              onChangeText={setPipValue}
              keyboardType="decimal-pad"
              placeholder="例: 1000"
              placeholderTextColor={c.textSecondary}
            />
            <Text style={styles.helper}>
              1ロット (10万通貨) で1pipの値動き時の円損益。{'\n'}
              JPY建てペア（USD/JPY等）は約1000円。USD建て（EUR/USD等）はUSD/JPY×10で換算。
            </Text>
          </View>

          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>リスク許容額</Text>
                <Text style={styles.resultValue}>
                  {Math.round(result.riskAmount).toLocaleString('ja-JP')} 円
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>適正ロット数</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.resultValue, styles.resultValueLarge]}>
                    {result.fineLots.toFixed(2)} ロット
                  </Text>
                  <Text style={styles.resultSub}>
                    （約 {Math.round(result.tenK)} 万通貨）
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.note}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={c.textSecondary}
            />
            <Text style={styles.noteText}>
              {' '}
              小数点ロットに対応していない業者では、計算結果以下の値で発注してください（リスクが想定を超えないため）。
            </Text>
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    body: { padding: 20, paddingBottom: 40 },
    intro: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 20,
    },
    section: { marginBottom: 16 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 8,
    },
    helper: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 6,
      lineHeight: 16,
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
    inputMt: { marginTop: 8 },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    preset: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    presetActive: { backgroundColor: c.accent, borderColor: c.accent },
    presetText: { fontSize: 11, color: c.textPrimary, fontWeight: '500' },
    presetTextActive: { color: '#fff', fontWeight: '700' },
    resultCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.accent,
      marginTop: 16,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    resultLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
    },
    resultValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    resultValueLarge: {
      fontSize: 24,
      color: c.accent,
    },
    resultSub: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 4,
    },
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      marginTop: 16,
    },
    noteText: {
      flex: 1,
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
    },
  });
}
