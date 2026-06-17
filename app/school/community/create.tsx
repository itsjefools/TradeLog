import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { COMMUNITY_PRODUCT_IDS } from '@/lib/iap';
import { getPlan } from '@/lib/premium';
import { supabase } from '@/lib/supabase';

type PriceTier = { tier_key: string; amount: number };

type CategoryKey = 'general' | 'strategy' | 'analysis' | 'beginner' | 'advanced';

export default function CreateCommunityScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [tierKey, setTierKey] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>('general');
  const [submitting, setSubmitting] = useState(false);

  // 価格ティア（IAPの固定価格）を取得。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('community_price_tiers')
        .select('tier_key, amount')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!cancelled) setTiers((data ?? []) as PriceTier[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: { key: CategoryKey; label: string }[] = [
    { key: 'general', label: t('community.cat_general') },
    { key: 'strategy', label: t('community.cat_strategy') },
    { key: 'analysis', label: t('community.cat_analysis') },
    { key: 'beginner', label: t('community.cat_beginner') },
    { key: 'advanced', label: t('community.cat_advanced') },
  ];

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('community.error'), t('community.name_required'));
      return;
    }
    const userId = session?.user.id;
    if (!userId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified, plan_tier, bonus_premium_until, total_trades')
      .eq('id', userId)
      .maybeSingle();

    if (isPaid) {
      if (!profile?.is_verified) {
        Alert.alert(t('community.error'), t('community.need_verification'));
        return;
      }
      if (getPlan(profile?.plan_tier, profile?.bonus_premium_until) !== 'pro') {
        Alert.alert(t('community.error'), t('community.need_premium'));
        return;
      }
      if ((profile?.total_trades ?? 0) < 10) {
        Alert.alert(t('community.error'), t('community.need_trades'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedTier = tiers.find((tr) => tr.tier_key === tierKey) ?? null;
      const monthlyPrice = isPaid ? selectedTier?.amount ?? 0 : 0;
      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          owner_id: userId,
          name: trimmedName,
          description: description.trim() || null,
          category,
          is_paid: isPaid,
          price_tier_key: isPaid ? tierKey : null,
          monthly_price: monthlyPrice,
          iap_product_id:
            isPaid && tierKey ? COMMUNITY_PRODUCT_IDS[tierKey] ?? null : null,
          owner_verified: profile?.is_verified ?? false,
          owner_is_premium:
            getPlan(profile?.plan_tier, profile?.bonus_premium_until) !== 'free',
        })
        .select('id')
        .single();

      if (error) throw new Error(error.message);

      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: userId,
        role: 'owner',
      });

      Alert.alert(t('community.created'), t('community.created_desc'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('community.create_failed');
      Alert.alert(t('community.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!name.trim() && !submitting && (!isPaid || !!tierKey);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('community.create_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t('community.name_label')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('community.name_placeholder')}
          placeholderTextColor={c.textSecondary}
          maxLength={50}
          style={styles.input}
        />

        <Text style={styles.label}>{t('community.desc_label')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('community.desc_placeholder')}
          placeholderTextColor={c.textSecondary}
          multiline
          maxLength={300}
          style={[styles.input, styles.inputMulti]}
        />

        <Text style={styles.label}>{t('community.category_label')}</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={[
                  styles.categoryChip,
                  active
                    ? styles.categoryChipActive
                    : styles.categoryChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active
                      ? styles.categoryChipTextActive
                      : styles.categoryChipTextInactive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>{t('community.paid_toggle')}</Text>
            <Text style={styles.toggleSub}>{t('community.paid_toggle_desc')}</Text>
          </View>
          <Switch
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ true: c.accent, false: c.surfaceAlt }}
          />
        </View>

        {isPaid && (
          <View style={styles.priceBlock}>
            <Text style={styles.label}>{t('community.price_label')}</Text>
            <View style={styles.tierRow}>
              {tiers.map((tr) => {
                const active = tierKey === tr.tier_key;
                return (
                  <TouchableOpacity
                    key={tr.tier_key}
                    onPress={() => setTierKey(tr.tier_key)}
                    style={[
                      styles.tierChip,
                      active ? styles.tierChipActive : styles.tierChipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierChipText,
                        active
                          ? styles.tierChipTextActive
                          : styles.tierChipTextInactive,
                      ]}
                    >
                      ¥{tr.amount.toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.tierChipUnit,
                        active && styles.tierChipTextActive,
                      ]}
                    >
                      /月
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>
                {t('community.paid_requirements')}
              </Text>
              <Text style={styles.requirementsBody}>
                {t('community.paid_req_1')}
                {'\n'}
                {t('community.paid_req_2')}
                {'\n'}
                {t('community.paid_req_3')}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleCreate}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <Text style={styles.submitButtonText}>
              {t('community.create_button')}
            </Text>
          )}
        </TouchableOpacity>
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
    body: { padding: 20, paddingBottom: 60 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 6,
    },
    input: {
      fontSize: 15,
      color: c.textPrimary,
      padding: 14,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      marginBottom: 18,
    },
    inputMulti: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 18,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    categoryChipActive: {
      borderColor: c.accent,
      backgroundColor: `${c.accent}1A`,
    },
    categoryChipInactive: {
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    categoryChipText: { fontSize: 13 },
    categoryChipTextActive: { color: c.accent, fontWeight: '700' },
    categoryChipTextInactive: { color: c.textSecondary, fontWeight: '500' },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      marginBottom: 8,
    },
    toggleTextWrap: { flex: 1, marginRight: 16 },
    toggleTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
    toggleSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    priceBlock: { marginBottom: 18 },
    tierRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tierChip: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    tierChipActive: {
      borderColor: c.accent,
      backgroundColor: `${c.accent}1A`,
    },
    tierChipInactive: {
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    tierChipText: { fontSize: 16, fontWeight: '800' },
    tierChipUnit: { fontSize: 11, marginLeft: 2, color: c.textSecondary },
    tierChipTextActive: { color: c.accent },
    tierChipTextInactive: { color: c.textSecondary },
    requirementsCard: {
      backgroundColor: 'rgba(245, 158, 11, 0.10)',
      borderRadius: 10,
      padding: 14,
      marginTop: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(245, 158, 11, 0.32)',
    },
    requirementsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#F59E0B',
      marginBottom: 6,
    },
    requirementsBody: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 18,
    },
    submitButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    submitButtonDisabled: { opacity: 0.4 },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.onAccent,
    },
  });
}
