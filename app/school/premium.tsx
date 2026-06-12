import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GoldGradient } from '@/components/gold-gradient';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { AnalyticsEvents } from '@/lib/analytics';
import { PLAN_COLORS } from '@/lib/design';
import {
  PRODUCT_IDS,
  purchaseSubscription,
  setupPurchaseListeners,
} from '@/lib/iap';
import { PLAN_FEATURES, type PlanCell } from '@/lib/premium-features';

type BillingPeriod = 'monthly' | 'yearly';
type PlanType = 'plus' | 'pro';

const PLANS = {
  plus: { monthly: 580, yearly: 4800 },
  pro: { monthly: 980, yearly: 7800 },
} as const;

function productIdFor(plan: PlanType, period: BillingPeriod): string {
  if (plan === 'pro')
    return period === 'yearly' ? PRODUCT_IDS.PRO_YEARLY : PRODUCT_IDS.PRO_MONTHLY;
  return period === 'yearly' ? PRODUCT_IDS.PLUS_YEARLY : PRODUCT_IDS.PLUS_MONTHLY;
}

export default function PlanScreen() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const k = isDark ? 'dark' : 'light';
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('plus');
  const [purchasing, setPurchasing] = useState(false);

  const c = PLAN_COLORS;

  useEffect(() => {
    AnalyticsEvents.paywallViewed('school');
  }, []);

  // IAP 購入リスナ（既存ロジック維持）
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const cleanup = setupPurchaseListeners(
      userId,
      () => {
        setPurchasing(false);
        Alert.alert(t('premium.success_title'), t('premium.success_message'), [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      (code) => {
        setPurchasing(false);
        Alert.alert(
          t('premium.error_title'),
          code === 'purchase_processing_failed'
            ? t('premium.error_processing')
            : t('premium.error_message'),
        );
      },
    );
    return cleanup;
  }, [session?.user.id, router, t]);

  const handlePurchase = async () => {
    if (purchasing) return;
    AnalyticsEvents.subscriptionStarted(`${selectedPlan}_${billingPeriod}`);
    setPurchasing(true);
    await purchaseSubscription(productIdFor(selectedPlan, billingPeriod));
  };

  const renderCellValue = (value: PlanCell) => {
    if (value === true) {
      return <Ionicons name="checkmark" size={18} color="#10B981" />;
    }
    if (value === false) {
      return (
        <Text style={[styles.cellText, { color: c.textMuted[k] }]}>—</Text>
      );
    }
    return (
      <Text style={[styles.cellText, { color: c.textPrimary[k] }]}>{value}</Text>
    );
  };

  const renderPlanCard = (plan: PlanType) => {
    const selected = selectedPlan === plan;
    const isPro = plan === 'pro';
    // Plus=エメラルド / Pro=ゴールド の選択色（ティア identity）
    const selColor = isPro ? c.gold : c.plusBorder;
    const price = billingPeriod === 'monthly' ? PLANS[plan].monthly : PLANS[plan].yearly;
    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          {
            borderColor: selected ? selColor : c.proBorder[k],
            borderWidth: selected ? 1.5 : 1,
            backgroundColor: selected && !isPro ? c.plusBg[k] : 'transparent',
            overflow: 'hidden',
          },
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        {/* Pro 選択時はゴールドの光沢を薄く敷く */}
        {selected && isPro && (
          <View style={[StyleSheet.absoluteFill, { opacity: 0.18 }]} pointerEvents="none">
            <GoldGradient id="proSelSheen" />
          </View>
        )}
        {plan === 'plus' && (
          <View style={styles.recommendBadge}>
            <Text style={styles.recommendBadgeText}>{t('premium.recommended')}</Text>
          </View>
        )}
        <View style={styles.planCardHeader}>
          <View style={styles.planNameRow}>
            <Text style={[styles.planIcon, { color: c.gold }]}>✦</Text>
            <Text style={[styles.planName, { color: c.textPrimary[k] }]}>
              {plan === 'plus' ? 'Plus' : 'Pro'}
            </Text>
          </View>
          {selected ? (
            <View style={[styles.checkCircle, { backgroundColor: selColor }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : (
            <View style={[styles.radioCircle, { borderColor: c.textMuted[k] }]} />
          )}
        </View>

        <Text style={[styles.planPrice, { color: c.textPrimary[k] }]}>
          ¥{price}
          <Text style={[styles.planPricePeriod, { color: c.textSecondary[k] }]}>
            /{billingPeriod === 'monthly' ? t('premium.perMonth').replace('/', '') : t('premium.perYear').replace('/', '')}
          </Text>
        </Text>

        <Text style={[styles.planDescription, { color: c.textSecondary[k] }]}>
          {t(`premium.tier_${plan}_tagline`)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.screenBg[k] }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary[k]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary[k] }]}>
          {t('premium.title')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ダイヤモンドアイコン */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.diamondCircle,
              {
                borderColor: c.gold,
                backgroundColor: isDark
                  ? 'rgba(212, 168, 85, 0.1)'
                  : 'rgba(212, 168, 85, 0.08)',
              },
            ]}
          >
            <Text style={styles.diamondEmoji}>💎</Text>
          </View>
        </View>

        <Text style={[styles.mainTitle, { color: c.textPrimary[k] }]}>
          {t('premium.intro_title')}
        </Text>
        <Text style={[styles.mainSubtitle, { color: c.textSecondary[k] }]}>
          {t('premium.subtitle')}
        </Text>

        {/* 期間切り替え */}
        <View
          style={[
            styles.periodToggle,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.periodTab,
              billingPeriod === 'monthly' && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.3 : 0.08,
                    shadowRadius: 3,
                  },
                  android: { elevation: 2 },
                }),
              },
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodTabText,
                {
                  color:
                    billingPeriod === 'monthly' ? c.textPrimary[k] : c.textSecondary[k],
                  fontWeight: billingPeriod === 'monthly' ? '600' : '400',
                },
              ]}
            >
              {t('premium.monthly')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodTab,
              billingPeriod === 'yearly' && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.3 : 0.08,
                    shadowRadius: 3,
                  },
                  android: { elevation: 2 },
                }),
              },
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <View style={styles.yearlyTabContent}>
              <Text
                style={[
                  styles.periodTabText,
                  {
                    color:
                      billingPeriod === 'yearly' ? c.textPrimary[k] : c.textSecondary[k],
                    fontWeight: billingPeriod === 'yearly' ? '600' : '400',
                  },
                ]}
              >
                {t('premium.yearly')}
              </Text>
              <View style={[styles.discountBadge, { backgroundColor: c.gold }]}>
                <Text style={styles.discountBadgeText}>{t('premium.save_hint')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* プランカード */}
        <View style={styles.planCardsRow}>
          {renderPlanCard('plus')}
          {renderPlanCard('pro')}
        </View>

        {/* 比較テーブル */}
        <Text style={[styles.comparisonTitle, { color: c.textPrimary[k] }]}>
          {t('premium.compare_title')}
        </Text>

        <View style={[styles.comparisonTable, { borderColor: c.tableBorder[k] }]}>
          <View
            style={[
              styles.tableHeaderRow,
              { borderBottomColor: c.tableBorder[k], backgroundColor: c.tableHeaderBg[k] },
            ]}
          >
            <View style={styles.tableFeatureCol} />
            <Text style={[styles.tableHeaderText, { color: c.textSecondary[k] }]}>Free</Text>
            <Text style={[styles.tableHeaderText, { color: '#10B981', fontWeight: '700' }]}>Plus</Text>
            <Text style={[styles.tableHeaderText, { color: c.gold, fontWeight: '700' }]}>Pro</Text>
          </View>

          {PLAN_FEATURES.map((row, index) => (
            <View
              key={row.titleKey}
              style={[
                styles.tableRow,
                index < PLAN_FEATURES.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: c.tableBorder[k],
                },
              ]}
            >
              <View style={styles.tableFeatureCol}>
                <Ionicons
                  name={row.iconName}
                  size={16}
                  color={c.textSecondary[k]}
                  style={styles.tableFeatureIcon}
                />
                <Text style={[styles.tableFeatureText, { color: c.textPrimary[k] }]} numberOfLines={1}>
                  {t(row.titleKey)}
                </Text>
              </View>
              <View style={styles.tableValueCol}>{renderCellValue(row.free)}</View>
              <View style={styles.tableValueCol}>{renderCellValue(row.plus)}</View>
              <View style={styles.tableValueCol}>{renderCellValue(row.pro)}</View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 固定購入ボタン */}
      <View
        style={[
          styles.purchaseFooter,
          { backgroundColor: c.screenBg[k], borderTopColor: c.tableBorder[k] },
        ]}
      >
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          <Text style={styles.purchaseButtonText}>
            {t('premium.subscribe_to', { plan: selectedPlan === 'plus' ? 'Plus' : 'Pro' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 20 },
  iconContainer: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  diamondCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4A855',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  diamondEmoji: { fontSize: 28 },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  mainSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  periodToggle: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 20 },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: { fontSize: 14, fontWeight: '400' },
  yearlyTabContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  planCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  planCard: { flex: 1, borderRadius: 14, padding: 16, minHeight: 140 },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planIcon: { fontSize: 14, fontWeight: '600' },
  planName: { fontSize: 17, fontWeight: '700' },
  recommendBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recommendBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  planPrice: { fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  planPricePeriod: { fontSize: 14, fontWeight: '400' },
  planDescription: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  comparisonTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  comparisonTable: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderText: { fontSize: 13, fontWeight: '600', width: 48, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  tableFeatureCol: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tableFeatureIcon: { marginRight: 8 },
  tableFeatureText: { fontSize: 13, fontWeight: '400', flex: 1 },
  tableValueCol: { width: 48, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 13, fontWeight: '500' },
  purchaseFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  purchaseButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
