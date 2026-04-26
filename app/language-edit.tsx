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
import { LocaleCode, SUPPORTED_LOCALES, useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';

export default function LanguageEditScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const { updateProfile } = useProfile();

  const handlePick = async (next: LocaleCode) => {
    await setLocale(next);
    try {
      await updateProfile({ language: next });
    } catch {
      // ignore
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>言語</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          {SUPPORTED_LOCALES.map((opt, i) => {
            const selected = locale === opt.code;
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
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color={c.accent} />
                  )}
                </Pressable>
                {i < SUPPORTED_LOCALES.length - 1 && (
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
    headerLink: {
      fontSize: 15,
      color: c.textSecondary,
      minWidth: 56,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 56,
    },
    body: {
      padding: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
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
