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
import { StatusBar } from 'expo-status-bar';

import { ThemeColors } from '@/constants/theme';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { TRADE_STYLE_OPTIONS, TradeStyle } from '@/lib/types';

type Mode = 'signIn' | 'signUp';

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'パスワードは8文字以上で入力してください。';
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    return 'パスワードには数字または記号を最低1つ含めてください。';
  }
  return null;
}

export default function LoginScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tradeStyle, setTradeStyle] = useState<TradeStyle | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }
    if (mode === 'signUp') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        Alert.alert('入力エラー', passwordError);
        return;
      }
      if (!tradeStyle) {
        Alert.alert('入力エラー', 'トレードスタイルを選択してください。');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          Alert.alert('ログイン失敗', error.message);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { trade_style: tradeStyle },
          },
        });
        if (error) {
          Alert.alert('登録失敗', error.message);
        } else if (!data.session) {
          Alert.alert(
            '確認メールを送信しました',
            '登録されたメールアドレスに届いた確認リンクをクリックしてください。',
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setTradeStyle(null);
  };

  const toggleTradeStyle = (value: TradeStyle) => {
    setTradeStyle((prev) => (prev === value ? null : value));
  };

  const isSignIn = mode === 'signIn';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>TradeLog</Text>
            <Text style={styles.tagline}>
              {isSignIn ? 'おかえりなさい' : 'アカウントを作成しましょう'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={c.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignIn ? 'パスワード' : '8文字以上、数字または記号を含む'}
                placeholderTextColor={c.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.label}>トレードスタイル</Text>
                <View style={styles.chipsRow}>
                  {TRADE_STYLE_OPTIONS.map((opt) => {
                    const selected = tradeStyle === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => toggleTradeStyle(opt.value)}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                loading && styles.buttonDisabled,
                pressed && !loading && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignIn ? 'ログイン' : 'アカウントを作成'}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={toggleMode} disabled={loading} style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isSignIn ? 'アカウントをお持ちでない方は ' : 'すでにアカウントをお持ちの方は '}
                <Text style={styles.switchTextAccent}>
                  {isSignIn ? '新規登録' : 'ログイン'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const LOGIN_ACCENT = '#10B981';

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: LOGIN_ACCENT,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: c.textSecondary,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
  },
  primaryButton: {
    backgroundColor: LOGIN_ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  switchTextAccent: {
    color: LOGIN_ACCENT,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: {
    backgroundColor: LOGIN_ACCENT,
    borderColor: LOGIN_ACCENT,
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
  });
}
