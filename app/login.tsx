import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { isAppleSignInAvailable, signInWithApple } from '@/lib/auth-apple';
import { isGoogleSignInConfigured, signInWithGoogle } from '@/lib/auth-google';
import { supabase } from '@/lib/supabase';
import { TRADE_STYLE_OPTIONS, TradeStyle } from '@/lib/types';

type Mode = 'signIn' | 'signUp';

const ACCENT = '#10B981';

function tradeStyleI18nKey(value: TradeStyle): string {
  switch (value) {
    case 'scalping':
      return 'auth.styleScalping';
    case 'day_trading':
      return 'auth.styleDayTrading';
    case 'swing':
      return 'auth.styleSwing';
    case 'position':
      return 'auth.stylePosition';
  }
}

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
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleConfigured = isGoogleSignInConfigured();

  useEffect(() => {
    let cancelled = false;
    isAppleSignInAvailable().then((ok) => {
      if (!cancelled) setAppleAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1)
      return { level: 1, label: t('auth.password_weak'), color: '#EF4444' };
    if (score <= 2)
      return { level: 2, label: t('auth.password_fair'), color: '#F59E0B' };
    if (score <= 3)
      return { level: 3, label: t('auth.password_good'), color: '#3B82F6' };
    return { level: 4, label: t('auth.password_strong'), color: '#10B981' };
  }, [password, t]);

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
    setErrorMessage('');
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await signInWithApple();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED' && err.code !== 'ERR_CANCELED') {
        Alert.alert(t('auth.error'), err.message ?? t('auth.errorSignInFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
    } catch (e) {
      const err = e as { code?: string | number; message?: string };
      // Google: -5 / SIGN_IN_CANCELLED は無視
      if (err.code !== -5 && err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('auth.error'), err.message ?? t('auth.errorSignInFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTradeStyle = (value: TradeStyle) => {
    setTradeStyle((prev) => (prev === value ? null : value));
  };

  const isSignIn = mode === 'signIn';
  const hasError = errorMessage !== '';

  const inputBorderColor = hasError
    ? '#EF4444'
    : isDark
      ? 'rgba(255,255,255,0.12)'
      : '#E5E7EB';
  const inputBgColor = isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB';
  const placeholderColor = isDark ? '#3B3B3B' : '#9CA3AF';
  const chipBorderIdle = isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB';
  const chipBgSelected = isDark
    ? 'rgba(16,185,129,0.08)'
    : 'rgba(16,185,129,0.05)';

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

          {/* メールアドレス */}
          <View
            style={[
              styles.inputBox,
              { borderColor: inputBorderColor, backgroundColor: inputBgColor },
            ]}
          >
            <Text style={styles.inputLabel}>{t('auth.email')}</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage('');
              }}
              placeholder="you@example.com"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={styles.inputControl}
            />
          </View>

          {/* パスワード */}
          <View
            style={[
              styles.inputBoxRow,
              { borderColor: inputBorderColor, backgroundColor: inputBgColor },
            ]}
          >
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              <TextInput
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
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.inputControl}
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={c.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!isSignIn && passwordStrength && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i <= passwordStrength.level
                            ? passwordStrength.color
                            : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: passwordStrength.color },
                ]}
              >
                {passwordStrength.label}
              </Text>
            </View>
          )}

          {hasError && <Text style={styles.errorText}>{errorMessage}</Text>}

          {!isSignIn && (
            <View style={styles.tradeStyleBlock}>
              <Text style={styles.sectionLabel}>{t('auth.tradeStyle')}</Text>
              <View style={styles.chipsRow}>
                {TRADE_STYLE_OPTIONS.map((opt) => {
                  const selected = tradeStyle === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => toggleTradeStyle(opt.value)}
                      disabled={loading}
                      activeOpacity={0.8}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? ACCENT : chipBorderIdle,
                          backgroundColor: selected
                            ? chipBgSelected
                            : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {t(tradeStyleI18nKey(opt.value))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignIn ? t('auth.login') : t('auth.signUp')}
              </Text>
            )}
          </TouchableOpacity>

          {(appleAvailable || googleConfigured) && (
            <>
              <View style={styles.socialDividerRow}>
                <View style={styles.socialDividerLine} />
                <Text style={styles.socialDividerText}>
                  {t('auth.or_continue_with')}
                </Text>
                <View style={styles.socialDividerLine} />
              </View>

              {appleAvailable && (
                <TouchableOpacity
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    },
                    loading && styles.buttonDisabled,
                  ]}
                >
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={isDark ? '#000000' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: isDark ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    {t('auth.continue_with_apple')}
                  </Text>
                </TouchableOpacity>
              )}

              {googleConfigured && (
                <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: inputBgColor,
                      borderWidth: 1,
                      borderColor: inputBorderColor,
                    },
                    loading && styles.buttonDisabled,
                  ]}
                >
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: c.textPrimary },
                    ]}
                  >
                    {t('auth.continue_with_google')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignIn ? t('auth.noAccount') : t('auth.haveAccount')}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={loading}>
              <Text style={styles.switchLink}>
                {isSignIn ? t('auth.signUpLink') : t('auth.signInLink')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors, _isDark: boolean) {
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
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingVertical: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logo: {
      fontSize: 30,
      fontWeight: '700',
      marginBottom: 8,
    },
    logoTrade: {
      color: c.textPrimary,
    },
    logoLog: {
      color: ACCENT,
    },
    tagline: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
    },
    inputBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      marginBottom: 14,
    },
    inputBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      marginBottom: 8,
    },
    inputLabel: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    inputControl: {
      fontSize: 16,
      color: c.textPrimary,
      paddingVertical: 2,
    },
    eyeButton: {
      paddingLeft: 12,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 13,
      marginBottom: 8,
      paddingLeft: 4,
    },
    strengthWrap: {
      marginTop: 2,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 4,
    },
    strengthBar: {
      flex: 1,
      height: 3,
      borderRadius: 1.5,
    },
    strengthLabel: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: '500',
    },
    socialDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 16,
    },
    socialDividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    socialDividerText: {
      marginHorizontal: 16,
      fontSize: 13,
      color: c.textSecondary,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 14,
      gap: 10,
      marginBottom: 10,
    },
    socialButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: _isDark ? '#FFFFFF' : '#111827',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      minHeight: 52,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: _isDark ? '#000000' : '#FFFFFF',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    switchText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    switchLink: {
      fontSize: 14,
      color: ACCENT,
      fontWeight: '600',
      marginLeft: 4,
    },
    tradeStyleBlock: {
      marginTop: 8,
      marginBottom: 8,
    },
    sectionLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
      marginBottom: 8,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8,
    },
    chipText: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '400',
    },
    chipTextSelected: {
      color: ACCENT,
      fontWeight: '600',
    },
  });
}
