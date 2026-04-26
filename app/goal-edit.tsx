import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';

export default function GoalEditScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [value, setValue] = useState(
    profile?.monthly_pnl_goal != null ? String(profile.monthly_pnl_goal) : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const goal = value.trim() === '' ? null : Number(value);
      if (goal !== null && !Number.isFinite(goal)) {
        Alert.alert('入力エラー', '数値を入力してください。');
        return;
      }
      await updateProfile({ monthly_pnl_goal: goal });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('保存失敗', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await updateProfile({ monthly_pnl_goal: null });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('削除失敗', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>月間目標</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Text style={[styles.headerLink, styles.saveLink]}>保存</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.intro}>
            月間のP&L目標を円で設定すると、{'\n'}
            分析画面に進捗バーが表示されます。
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>目標金額（円）</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              keyboardType="numbers-and-punctuation"
              placeholder="例: 100000"
              placeholderTextColor={c.textSecondary}
              editable={!saving}
            />
            <Text style={styles.helper}>
              空欄のまま保存すると目標を解除できます。
            </Text>
          </View>

          {profile?.monthly_pnl_goal != null && (
            <Pressable
              onPress={handleClear}
              disabled={saving}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
            >
              <Text style={styles.clearText}>目標を削除</Text>
            </Pressable>
          )}
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
    headerLink: { fontSize: 15, color: c.textSecondary, minWidth: 56 },
    saveLink: { color: c.accent, fontWeight: '700', textAlign: 'right' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    body: { padding: 20, paddingBottom: 40 },
    intro: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 24,
    },
    section: { marginBottom: 24 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 18,
      color: c.textPrimary,
      fontWeight: '700',
    },
    helper: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 6,
    },
    clearButton: {
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.danger,
    },
    clearButtonPressed: { opacity: 0.7 },
    clearText: { fontSize: 14, color: c.danger, fontWeight: '600' },
  });
}
