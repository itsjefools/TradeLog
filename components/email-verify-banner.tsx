import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

/**
 * メール未認証ユーザー向けに表示する細いバナー。
 * email_confirmed_at が null の時だけ表示。dismiss はセッションメモリのみ。
 */
export function EmailVerifyBanner() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t } = useI18n();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  const user = session?.user;
  const needsVerification = !!user && !user.email_confirmed_at;

  if (!needsVerification || dismissed) return null;

  const handleResend = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      Alert.alert(
        t('auth.confirmationEmailTitle'),
        t('auth.confirmationEmailBody'),
      );
    } catch (e) {
      Alert.alert(
        t('auth.error'),
        e instanceof Error ? e.message : t('auth.errorSignInFailed'),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Ionicons name="mail-outline" size={16} color="#F59E0B" />
      <Text style={styles.message} numberOfLines={2}>
        {t('auth.verify_email_reminder')}
      </Text>
      <TouchableOpacity
        onPress={handleResend}
        disabled={resending}
        hitSlop={6}
        style={styles.resendButton}
      >
        <Text style={styles.resendText}>
          {resending ? '...' : t('auth.resend')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        hitSlop={6}
        style={styles.dismissButton}
      >
        <Ionicons name="close" size={16} color={c.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : '#FFF7ED',
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(245,158,11,0.30)',
    },
    message: {
      flex: 1,
      fontSize: 12,
      color: c.textPrimary,
      lineHeight: 16,
    },
    resendButton: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    resendText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#F59E0B',
    },
    dismissButton: {
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
  });
}
