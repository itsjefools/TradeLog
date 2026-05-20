import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';
import {
  getSubscriptionProducts,
  purchaseSubscription,
  setupPurchaseListeners,
  PRODUCT_IDS,
} from '@/lib/iap';

type Plan = 'monthly' | 'yearly';

type IapProduct = {
  id?: string;
  productId?: string;
  displayPrice?: string;
  price?: string | number;
  localizedPrice?: string;
  priceString?: string;
};

function priceLabel(product: IapProduct | undefined, fallback: string): string {
  if (!product) return fallback;
  return (
    product.displayPrice ||
    product.localizedPrice ||
    product.priceString ||
    (typeof product.price === 'string' ? product.price : undefined) ||
    fallback
  );
}

export default function SchoolPremiumScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const { isPremium, refresh } = usePremium();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [products, setProducts] = useState<IapProduct[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const subs = await getSubscriptionProducts();
      if (!cancelled) setProducts(subs as IapProduct[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const cleanup = setupPurchaseListeners(
      userId,
      () => {
        setPurchasing(false);
        refresh();
        Alert.alert(
          t('premium.success_title'),
          t('premium.success_message'),
          [{ text: 'OK', onPress: () => router.back() }],
        );
      },
      (code) => {
        setPurchasing(false);
        const msg =
          code === 'purchase_processing_failed'
            ? t('premium.error_processing')
            : t('premium.error_message');
        Alert.alert(t('premium.error_title'), msg);
      },
    );
    return cleanup;
  }, [session?.user.id, refresh, router, t]);

  const monthlyProduct = products.find(
    (p) => (p.id ?? p.productId) === PRODUCT_IDS.PREMIUM_MONTHLY,
  );
  const yearlyProduct = products.find(
    (p) => (p.id ?? p.productId) === PRODUCT_IDS.PREMIUM_YEARLY,
  );

  const handlePurchase = async () => {
    const productId =
      selectedPlan === 'yearly'
        ? PRODUCT_IDS.PREMIUM_YEARLY
        : PRODUCT_IDS.PREMIUM_MONTHLY;
    setPurchasing(true);
    await purchaseSubscription(productId);
    // 結果は setupPurchaseListeners が拾う
  };

  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.alreadyWrap}>
          <Text style={styles.alreadyEmoji}>✨</Text>
          <Text style={styles.alreadyTitle}>{t('premium.already_premium')}</Text>
          <Text style={styles.alreadyDesc}>
            {t('premium.already_premium_desc')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.heroBlock}>
          <Ionicons name="diamond" size={48} color={c.accent} />
          <Text style={styles.heroTitle}>TradeLog Premium</Text>
          <Text style={styles.heroDesc}>{t('premium.description')}</Text>
        </View>

        <View style={styles.benefitList}>
          {[
            { icon: 'school', text: t('premium.benefit_lessons') },
            { icon: 'flash', text: t('premium.benefit_strategies') },
            { icon: 'people', text: t('premium.benefit_community') },
            { icon: 'star', text: t('premium.benefit_badge') },
          ].map((item) => (
            <View key={item.text} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={c.accent}
                />
              </View>
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansWrap}>
          <Pressable
            onPress={() => setSelectedPlan('monthly')}
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardActive,
            ]}
          >
            <View>
              <Text style={styles.planLabel}>{t('premium.monthly')}</Text>
              <Text style={styles.planNote}>{t('premium.cancel_anytime')}</Text>
            </View>
            <Text style={styles.planPrice}>
              {priceLabel(monthlyProduct, '¥980/月')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPlan('yearly')}
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardActive,
            ]}
          >
            <View>
              <Text style={styles.planLabel}>{t('premium.yearly')}</Text>
              <Text style={styles.planSave}>{t('premium.yearly_save')}</Text>
            </View>
            <Text style={styles.planPrice}>
              {priceLabel(yearlyProduct, '¥7,800/年')}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing}
          style={({ pressed }) => [
            styles.subscribeButton,
            pressed && !purchasing && styles.subscribeButtonPressed,
            purchasing && styles.subscribeButtonDisabled,
          ]}
        >
          {purchasing ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {t('premium.subscribe_button')}
            </Text>
          )}
        </Pressable>

        <Text style={styles.termsNotice}>{t('premium.terms_notice')}</Text>
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
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: { width: 26 },
    body: {
      padding: 20,
      paddingBottom: 60,
    },
    heroBlock: {
      alignItems: 'center',
      paddingVertical: 18,
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.4,
      marginTop: 10,
      marginBottom: 6,
    },
    heroDesc: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      paddingHorizontal: 16,
    },
    benefitList: {
      gap: 14,
      marginBottom: 24,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    benefitIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${c.accent}1F`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    benefitText: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
    },
    plansWrap: {
      gap: 10,
      marginBottom: 20,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    planCardActive: {
      borderColor: c.accent,
    },
    planLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    planNote: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    planSave: {
      fontSize: 12,
      color: c.accent,
      fontWeight: '600',
      marginTop: 2,
    },
    planPrice: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
    },
    subscribeButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    subscribeButtonPressed: { opacity: 0.85 },
    subscribeButtonDisabled: { opacity: 0.6 },
    subscribeButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.onAccent,
    },
    termsNotice: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 14,
      lineHeight: 16,
    },
    alreadyWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    alreadyEmoji: { fontSize: 48, marginBottom: 16 },
    alreadyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 8,
    },
    alreadyDesc: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
}
