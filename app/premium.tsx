import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { ThemeColors } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { getPlan, planLabel, PREMIUM_FEATURES } from '@/lib/premium';

export default function PremiumScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profile } = useProfile();
  const plan = getPlan(profile?.is_premium);

  const handleUpgrade = () => {
    Alert.alert(
      'Premium プラン',
      '課金フローは現在準備中です。\n決済システムの統合後に有効になります。',
      [{ text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.heroCard}>
          <Ionicons name="diamond" size={56} color={c.accent} />
          <Text style={styles.heroTitle}>TradeLog Premium</Text>
          <Text style={styles.heroSubtitle}>
            あなたのトレードをさらに加速
          </Text>
          <View style={styles.planChip}>
            <Text style={styles.planChipText}>
              現在のプラン: {planLabel(plan)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Premium で得られる体験</Text>

        <View style={styles.featuresCard}>
          {PREMIUM_FEATURES.map((feature, i) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={c.win} />
              <Text style={styles.featureText}>{feature}</Text>
              {i < PREMIUM_FEATURES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>¥980</Text>
            <Text style={styles.priceSub}>/月</Text>
          </View>
          <Text style={styles.priceNote}>または年額 ¥9,800（2ヶ月分お得）</Text>
        </View>

        <Pressable
          onPress={handleUpgrade}
          disabled={plan === 'premium'}
          style={({ pressed }) => [
            styles.upgradeButton,
            plan === 'premium' && styles.upgradeButtonDisabled,
            pressed && styles.upgradeButtonPressed,
          ]}
        >
          <Text style={styles.upgradeButtonText}>
            {plan === 'premium' ? 'Premium 利用中' : 'Premium にアップグレード'}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          ※ 決済システム統合は今後実装予定です。{'\n'}
          現状は管理者からの手動付与のみです。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    body: { padding: 20, paddingBottom: 40, gap: 20 },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      gap: 8,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      marginTop: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 8,
    },
    planChip: {
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 999,
    },
    planChipText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    sectionLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    featuresCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      flexWrap: 'wrap',
    },
    featureText: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
    },
    divider: {
      position: 'absolute',
      left: 32,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    priceCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.accent,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    priceMain: {
      fontSize: 36,
      fontWeight: '800',
      color: c.textPrimary,
    },
    priceSub: { fontSize: 16, color: c.textSecondary, fontWeight: '500' },
    priceNote: { fontSize: 12, color: c.textSecondary, marginTop: 6 },
    upgradeButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upgradeButtonDisabled: { opacity: 0.5 },
    upgradeButtonPressed: { opacity: 0.85 },
    upgradeButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    disclaimer: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
}
