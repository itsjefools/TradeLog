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
import { SUPPORTED_LOCALES, useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const PREMIUM_GREEN = '#10B981';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { mode, setMode } = useTheme();
  const { locale } = useI18n();
  const email = session?.user.email ?? '—';

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'システム' },
    { value: 'light', label: 'ライト' },
    { value: 'dark', label: 'ダーク' },
  ];

  const currentLocaleLabel =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.label ?? '日本語';

  const handleLogout = () => {
    Alert.alert('ログアウト', '本当にログアウトしますか？', [
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* アカウント */}
        <Text style={styles.sectionLabel}>アカウント</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBubble, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="mail-outline" size={18} color={c.textPrimary} />
              </View>
              <Text style={styles.rowLabel}>メール</Text>
            </View>
            <Text style={styles.rowValue} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Divider c={c} />
          <NavRow href="/profile-edit" icon="person-outline" label="プロフィールを編集" c={c} styles={styles} />
          <Divider c={c} />
          <NavRow href="/trade-history" icon="document-text-outline" label="取引履歴" c={c} styles={styles} />
          <Divider c={c} />
          <NavRow href="/bookmarks" icon="bookmark-outline" label="ブックマーク" c={c} styles={styles} />
        </View>

        {/* Premium */}
        <Link href="/premium" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.premiumCard,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.premiumLeft}>
              <View style={styles.premiumIcon}>
                <Ionicons name="diamond" size={18} color="#fff" />
              </View>
              <View style={styles.premiumTextWrap}>
                <Text style={styles.premiumTitle}>Premium</Text>
                <Text style={styles.premiumSub}>
                  無制限記録・高度分析・広告なし
                </Text>
              </View>
            </View>
          </Pressable>
        </Link>

        {/* ツール */}
        <Text style={styles.sectionLabel}>ツール</Text>
        <View style={styles.card}>
          <NavRow href="/goal-edit" icon="flag-outline" label="月間目標" c={c} styles={styles} />
          <Divider c={c} />
          <NavRow href="/risk-calculator" icon="calculator-outline" label="リスク計算機" c={c} styles={styles} />
          <Divider c={c} />
          <NavRow
            href="/economic-calendar"
            icon="calendar-outline"
            label="経済指標カレンダー"
            c={c}
            styles={styles}
          />
        </View>

        {/* 表示 */}
        <Text style={styles.sectionLabel}>表示</Text>
        <View style={styles.card}>
          <View style={styles.themeRowOuter}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBubble, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons
                  name="contrast-outline"
                  size={18}
                  color={c.textPrimary}
                />
              </View>
              <Text style={styles.rowLabel}>テーマ</Text>
            </View>
            <View style={styles.segment}>
              {themeOptions.map((opt) => {
                const selected = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={[
                      styles.segmentChip,
                      selected && styles.segmentChipSelected,
                    ]}
                    hitSlop={4}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected && styles.segmentTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Divider c={c} />
          <NavRow
            href="/language-edit"
            icon="language-outline"
            label="言語"
            value={currentLocaleLabel}
            c={c}
            styles={styles}
          />
        </View>

        {/* プライバシーと安全 */}
        <Text style={styles.sectionLabel}>プライバシーと安全</Text>
        <View style={styles.card}>
          <NavRow
            href="/blocked-users"
            icon="ban-outline"
            label="ブロック中のユーザー"
            c={c}
            styles={styles}
          />
          <Divider c={c} />
          <NavRow
            href="/account-delete"
            icon="trash-outline"
            label="アカウントを削除"
            c={c}
            styles={styles}
          />
        </View>

        {/* 法的事項 */}
        <Text style={styles.sectionLabel}>法的事項</Text>
        <View style={styles.card}>
          <NavRow
            href="/terms"
            icon="document-text-outline"
            label="利用規約"
            c={c}
            styles={styles}
          />
          <Divider c={c} />
          <NavRow
            href="/privacy"
            icon="shield-checkmark-outline"
            label="プライバシーポリシー"
            c={c}
            styles={styles}
          />
        </View>

        {/* ログアウト */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={handleLogout}
          hitSlop={4}
        >
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider({ c }: { c: ThemeColors }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.border,
        marginLeft: 56,
      }}
    />
  );
}

function NavRow({
  href,
  icon,
  label,
  value,
  c,
  styles,
}: {
  href: string;
  icon: IoniconName;
  label: string;
  value?: string;
  c: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        hitSlop={4}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBubble, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name={icon} size={18} color={c.textPrimary} />
          </View>
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        {value && (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        )}
      </Pressable>
    </Link>
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
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 56,
    },
    body: {
      padding: 20,
      paddingBottom: 60,
    },
    sectionLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      marginTop: 24,
      marginLeft: 4,
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
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 56,
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconBubble: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '500',
      flexShrink: 1,
    },
    rowValue: {
      fontSize: 14,
      color: c.textSecondary,
      flexShrink: 1,
    },
    premiumCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: PREMIUM_GREEN,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 12,
    },
    premiumLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    premiumIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: PREMIUM_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumTextWrap: {
      flex: 1,
    },
    premiumTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: PREMIUM_GREEN,
    },
    premiumSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    themeRowOuter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      minHeight: 56,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: 9,
      padding: 2,
    },
    segmentChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 7,
      minWidth: 52,
      alignItems: 'center',
    },
    segmentChipSelected: {
      backgroundColor: PREMIUM_GREEN,
    },
    segmentText: {
      fontSize: 12,
      color: c.textPrimary,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    logoutButton: {
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 36,
    },
    logoutButtonPressed: {
      opacity: 0.5,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.danger,
    },
  });
}
