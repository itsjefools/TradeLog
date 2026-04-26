import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, ThemeMode } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { LocaleCode, SUPPORTED_LOCALES, useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { mode, setMode } = useTheme();
  const { locale, setLocale } = useI18n();
  const { updateProfile } = useProfile();
  const email = session?.user.email ?? '—';

  const handleLocaleChange = async (next: LocaleCode) => {
    await setLocale(next);
    // profile.language も同期更新（失敗しても無視）
    try {
      await updateProfile({ language: next });
    } catch {
      // ignore
    }
  };

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'システム連動' },
    { value: 'light', label: 'ライト' },
    { value: 'dark', label: 'ダーク' },
  ];

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('エラー', error.message);
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>アカウント</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>メールアドレス</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <View style={styles.divider} />
          <Link href="/profile-edit" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>プロフィールを編集</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.textSecondary}
              />
            </Pressable>
          </Link>
          <View style={styles.divider} />
          <Link href="/trade-history" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>取引履歴</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.textSecondary}
              />
            </Pressable>
          </Link>
          <View style={styles.divider} />
          <Link href="/bookmarks" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>ブックマーク</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.textSecondary}
              />
            </Pressable>
          </Link>
          <View style={styles.divider} />
          <Link href="/premium" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.premiumLabelRow}>
                <Ionicons name="diamond-outline" size={16} color={c.accent} />
                <Text style={[styles.rowLabel, { color: c.accent }]}>
                  Premium
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.textSecondary}
              />
            </Pressable>
          </Link>
        </View>

        <Text style={styles.sectionLabel}>テーマ</Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const selected = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.themeChip, selected && styles.themeChipSelected]}
                  onPress={() => setMode(opt.value)}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      selected && styles.themeChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>言語</Text>
        <View style={styles.card}>
          {SUPPORTED_LOCALES.map((opt, i) => {
            const selected = locale === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => handleLocaleChange(opt.code)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.rowLabel}>{opt.label}</Text>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={c.accent}
                  />
                )}
                {i < SUPPORTED_LOCALES.length - 1 && (
                  <View style={styles.dividerInline} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
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
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    body: {
      padding: 20,
      paddingBottom: 40,
    },
    sectionLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    rowLabel: {
      fontSize: 14,
      color: c.textPrimary,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 14,
      color: c.textSecondary,
      flex: 1,
      textAlign: 'right',
      marginLeft: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 16,
    },
    dividerInline: {
      position: 'absolute',
      left: 16,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    premiumLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
    },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    themeChipSelected: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    themeChipText: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '500',
    },
    themeChipTextSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    logoutButton: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 32,
      borderWidth: 1,
      borderColor: c.border,
    },
    logoutButtonPressed: {
      opacity: 0.7,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.danger,
    },
  });
}
