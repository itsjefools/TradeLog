import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useRevenueCat } from '@/hooks/use-revenue-cat';
import { useThemeColors } from '@/hooks/use-theme';
import { getPlan, planLabel, PREMIUM_FEATURES } from '@/lib/premium';

export default function PremiumScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profile } = useProfile();
  const {
    configured,
    isPremium,
    offering,
    purchasing,
    refreshing,
    purchase,
    restore,
  } = useRevenueCat();
  const plan = getPlan(profile?.is_premium || isPremium);

  const monthlyPkg =
    offering?.availablePackages.find((p) => p.packageType === 'MONTHLY') ??
    null;
  const annualPkg =
    offering?.availablePackages.find((p) => p.packageType === 'ANNUAL') ??
    null;
  const fallbackPkg = offering?.availablePackages?.[0] ?? null;

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      const ok = await purchase(pkg);
      if (ok) {
        Alert.alert(
          'ありがとうございます！',
          'Premium へのアップグレードが完了しました。',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('購入に失敗しました', msg);
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await restore();
      Alert.alert(
        restored ? '復元しました' : '購入履歴がありません',
        restored
          ? '以前の購入を復元しました。'
          : 'このアカウントに有効な購入が見つかりませんでした。',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('復元に失敗しました', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
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
              {i < PREMIUM_FEATURES.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>

        {!configured && (
          <View style={styles.warningCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={c.textSecondary}
            />
            <Text style={styles.warningText}>
              課金システムは開発ビルドでのみ利用可能です。{'\n'}
              EAS Build で開発ビルドを作成してください。
            </Text>
          </View>
        )}

        {configured && !offering && !refreshing && (
          <View style={styles.warningCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={c.textSecondary}
            />
            <Text style={styles.warningText}>
              商品情報を取得できませんでした。{'\n'}
              RevenueCat の Offering 設定を確認してください。
            </Text>
          </View>
        )}

        {/* プラン購入カード */}
        {configured && offering && (
          <View style={styles.plansWrap}>
            <PlanCard
              styles={styles}
              c={c}
              pkg={monthlyPkg ?? fallbackPkg}
              label="月額プラン"
              priceSuffix="/月"
              recommended={false}
              busy={purchasing}
              disabled={isPremium}
              onPress={handlePurchase}
            />
            <PlanCard
              styles={styles}
              c={c}
              pkg={annualPkg}
              label="年額プラン"
              priceSuffix="/年"
              recommended={true}
              recommendedNote="2ヶ月分お得"
              busy={purchasing}
              disabled={isPremium}
              onPress={handlePurchase}
            />
          </View>
        )}

        <Pressable
          onPress={handleRestore}
          disabled={refreshing || !configured}
          style={({ pressed }) => [
            styles.restoreButton,
            pressed && styles.restoreButtonPressed,
            (!configured || refreshing) && styles.restoreButtonDisabled,
          ]}
          hitSlop={4}
        >
          {refreshing ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Text style={styles.restoreText}>購入を復元</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          サブスクリプションは購入時に自動更新されます。{'\n'}
          解約は App Store / Google Play の設定からいつでも可能です。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  styles,
  c,
  pkg,
  label,
  priceSuffix,
  recommended,
  recommendedNote,
  busy,
  disabled,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: ThemeColors;
  pkg: PurchasesPackage | null;
  label: string;
  priceSuffix: string;
  recommended: boolean;
  recommendedNote?: string;
  busy: boolean;
  disabled: boolean;
  onPress: (pkg: PurchasesPackage) => void;
}) {
  if (!pkg) return null;
  const product = pkg.product;

  return (
    <Pressable
      onPress={() => onPress(pkg)}
      disabled={busy || disabled}
      style={({ pressed }) => [
        styles.planCard,
        recommended && styles.planCardRecommended,
        pressed && !busy && !disabled && styles.planCardPressed,
        (busy || disabled) && styles.planCardDisabled,
      ]}
      hitSlop={4}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planLabel}>{label}</Text>
        {recommended && recommendedNote && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>{recommendedNote}</Text>
          </View>
        )}
      </View>
      <View style={styles.planPriceRow}>
        <Text style={styles.planPrice}>{product.priceString}</Text>
        <Text style={styles.planPriceSub}>{priceSuffix}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={c.accent} />
      ) : (
        <Text style={styles.planCta}>
          {disabled ? '利用中' : 'このプランを選ぶ'}
        </Text>
      )}
    </Pressable>
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
    headerLink: { fontSize: 15, color: c.textSecondary, minWidth: 56 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 56 },
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
    warningCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 14,
      alignItems: 'flex-start',
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    plansWrap: {
      gap: 12,
    },
    planCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1.5,
      borderColor: c.border,
      gap: 8,
    },
    planCardRecommended: {
      borderColor: c.accent,
    },
    planCardPressed: {
      opacity: 0.85,
    },
    planCardDisabled: {
      opacity: 0.5,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    recommendedBadge: {
      backgroundColor: c.accent,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    recommendedBadgeText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '700',
    },
    planPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    planPrice: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
    },
    planPriceSub: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500',
    },
    planCta: {
      fontSize: 13,
      fontWeight: '600',
      color: c.accent,
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    restoreButtonPressed: {
      opacity: 0.6,
    },
    restoreButtonDisabled: {
      opacity: 0.4,
    },
    restoreText: {
      fontSize: 14,
      color: c.accent,
      fontWeight: '600',
    },
    disclaimer: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
}
