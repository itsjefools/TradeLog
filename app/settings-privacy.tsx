import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, ThemeMode } from '@/constants/theme';
import { SUPPORTED_LOCALES, useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsPrivacyScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { locale } = useI18n();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'システム' },
    { value: 'light', label: 'ライト' },
    { value: 'dark', label: 'ダーク' },
  ];

  const currentLocaleLabel =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.label ?? '日本語';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>設定とプライバシー</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Section label="表示" c={c}>
          <View style={styles.themeRow}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="contrast-outline"
                size={20}
                color={c.textSecondary}
              />
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
          <Row
            href="/language-edit"
            icon="language-outline"
            label="言語"
            value={currentLocaleLabel}
            c={c}
          />
        </Section>

        <Section label="プライバシーと安全" c={c}>
          <Row
            href="/blocked-users"
            icon="ban-outline"
            label="ブロック中のユーザー"
            c={c}
          />
          <Divider c={c} />
          <Row
            href="/account-delete"
            icon="trash-outline"
            label="アカウントを削除"
            c={c}
            danger
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  label,
  children,
  c,
}: {
  label: string;
  children: React.ReactNode;
  c: ThemeColors;
}) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 12,
          color: c.textSecondary,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Divider({ c }: { c: ThemeColors }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.border,
        marginLeft: 50,
      }}
    />
  );
}

function Row({
  href,
  icon,
  label,
  value,
  c,
  danger,
}: {
  href: string;
  icon: IoniconName;
  label: string;
  value?: string;
  c: ThemeColors;
  danger?: boolean;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [
          rowStyles.row,
          pressed && { backgroundColor: c.surfaceAlt },
        ]}
        hitSlop={4}
      >
        <View style={rowStyles.left}>
          <Ionicons
            name={icon}
            size={20}
            color={danger ? c.danger : c.textSecondary}
          />
          <Text
            style={[
              rowStyles.label,
              { color: danger ? c.danger : c.textPrimary },
            ]}
          >
            {label}
          </Text>
        </View>
        {value && (
          <Text
            style={[rowStyles.value, { color: c.textSecondary }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  value: {
    fontSize: 14,
    flexShrink: 1,
    maxWidth: '50%',
  },
});

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
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 26,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 60,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      minHeight: 50,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: c.textPrimary,
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
      minWidth: 50,
      alignItems: 'center',
    },
    segmentChipSelected: {
      backgroundColor: c.accent,
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
  });
}
