import { Ionicons } from '@expo/vector-icons';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { TRADE_STYLE_OPTIONS, TradeStyle } from '@/lib/types';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tradeStyle, setTradeStyle] = useState<TradeStyle | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t('auth.validationPasswordLength');
    }
    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      return t('auth.validationPasswordChars');
    }
    return null;
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage(t('auth.validationEmail'));
      return;
    }
    if (!password) {
      setErrorMessage(t('auth.validationPassword'));
      return;
    }
    if (mode === 'signUp') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setErrorMessage(passwordError);
        return;
      }
      if (!tradeStyle) {
        setErrorMessage(t('auth.validationTradeStyle'));
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
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage(t('auth.errorInvalidCredentials'));
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMessage(t('auth.errorEmailNotConfirmed'));
          } else {
            setErrorMessage(t('auth.errorSignInFailed'));
          }
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
          if (error.message.includes('already registered')) {
            setErrorMessage(t('auth.errorAlreadyRegistered'));
          } else {
            setErrorMessage(t('auth.errorSignUpFailed'));
          }
        } else if (!data.session) {
          Alert.alert(
            t('auth.confirmationEmailTitle'),
            t('auth.confirmationEmailBody'),
          );
        }
      }
    } catch {
      setErrorMessage(t('auth.errorNetwork'));
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
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>
              <Text style={styles.logoTrade}>Trade</Text>
              <Text style={styles.logoLog}>Log</Text>
            </Text>
            <Text style={styles.tagline}>
              {isSignIn ? t('auth.welcomeBack') : t('auth.welcomeNew')}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={[
                  styles.input,
                  !!errorMessage && styles.inputError,
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage('');
                }}
                placeholder="you@example.com"
                placeholderTextColor={c.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View
                style={[
                  styles.passwordWrap,
                  !!errorMessage && styles.inputError,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage('');
                  }}
                  placeholder={
                    isSignIn
                      ? t('auth.passwordPlaceholder')
                      : t('auth.passwordHint')
                  }
                  placeholderTextColor={c.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={c.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errorMessage !== '' && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
            </View>

            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.tradeStyle')}</Text>
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
                  {isSignIn ? t('auth.login') : t('auth.signUp')}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={toggleMode} disabled={loading} style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isSignIn ? t('auth.noAccount') : t('auth.haveAccount')}
                <Text style={styles.switchTextAccent}>
                  {isSignIn ? t('auth.signUpLink') : t('auth.signInLink')}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
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
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  logoTrade: {
    color: isDark ? '#FFFFFF' : '#1E293B',
  },
  logoLog: {
    color: c.accent,
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
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
  },
  eyeButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: 6,
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
    color: c.accent,
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
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  });
}
