import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';

/**
 * 非プレミアムユーザーにはロック画面を出し、プレミアムなら children を表示する。
 * feature は premium.feature_<feature>_desc の翻訳キーに対応する。
 */
export function PremiumGate({
  children,
  feature,
}: {
  children: ReactNode;
  feature: string;
}) {
  const { isPremium, testUnlock } = usePremium();
  const router = useRouter();
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (isPremium) {
    // テスト解放で開けている場合は、本来プレミアム機能だと分かるバナーを上に出す
    if (testUnlock) {
      return (
        <View style={{ flex: 1 }}>
          <View style={styles.banner}>
            <Ionicons name="lock-open-outline" size={14} color={c.accent} />
            <Text style={styles.bannerText}>{t('premium.testUnlockBanner')}</Text>
          </View>
          {children}
        </View>
      );
    }
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      <Ionicons
        name="lock-closed-outline"
        size={40}
        color={c.textSecondary}
        style={styles.icon}
      />
      <Text style={styles.title}>{t('premium.unlock_feature')}</Text>
      <Text style={styles.body}>{t(`premium.feature_${feature}_desc`)}</Text>
      <Pressable
        onPress={() => router.push('/school/premium')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.ctaText}>{t('premium.view_plans')}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: c.background,
    },
    icon: { opacity: 0.4, marginBottom: 16 },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
    cta: {
      marginTop: 24,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    ctaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
      backgroundColor: `${c.accent}14`,
    },
    bannerText: { fontSize: 12, fontWeight: '600', color: c.accent },
  });
}
