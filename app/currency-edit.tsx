import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { CurrencyCode, SUPPORTED_CURRENCIES } from '@/lib/types';

export default function CurrencyEditScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { t } = useI18n();
  const { profile, updateProfile } = useProfile();
  const current = (profile?.currency as CurrencyCode | null) ?? 'JPY';

  const handlePick = async (next: CurrencyCode) => {
    if (next === current) {
      router.back();
      return;
    }
    try {
      await updateProfile({ currency: next });
    } catch {
      // ignore - 失敗してもUIは反応している風に
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('currencyEdit.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.description}>{t('currencyEdit.description')}</Text>
        <View style={styles.card}>
          {SUPPORTED_CURRENCIES.map((opt, i) => {
            const selected = current === opt.code;
            return (
              <View key={opt.code}>
                <Pressable
                  onPress={() => handlePick(opt.code)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  hitSlop={4}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowSymbol}>{opt.symbol}</Text>
                    <Text style={styles.rowLabel}>{opt.label}</Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color={c.accent} />
                  )}
                </Pressable>
                {i < SUPPORTED_CURRENCIES.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 26,
    },
    body: {
      padding: 20,
      paddingBottom: 40,
    },
    description: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 16,
      lineHeight: 19,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 10,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: 52,
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    rowSymbol: {
      fontSize: 16,
      fontWeight: '700',
      color: c.accent,
      minWidth: 36,
    },
    rowLabel: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '500',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 16,
    },
  });
}
