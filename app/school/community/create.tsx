import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { supabase } from '@/lib/supabase';

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
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<CategoryKey>('general');
  const [submitting, setSubmitting] = useState(false);

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
      .select('is_verified, is_premium, total_trades')
      .eq('id', userId)
      .maybeSingle();

    if (isPaid) {
      if (!profile?.is_verified) {
        Alert.alert(t('community.error'), t('community.need_verification'));
        return;
      }
      if (!profile?.is_premium) {
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
      const monthlyPrice = isPaid ? parseInt(price, 10) || 0 : 0;
      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          owner_id: userId,
          name: trimmedName,
          description: description.trim() || null,
          category,
          is_paid: isPaid,
          monthly_price: monthlyPrice,
          owner_verified: profile?.is_verified ?? false,
          owner_is_premium: profile?.is_premium ?? false,
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

  const canSubmit = !!name.trim() && !submitting;

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
            <View style={styles.priceRow}>
              <Text style={styles.priceSymbol}>¥</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="500"
                placeholderTextColor={c.textSecondary}
                keyboardType="numeric"
                maxLength={6}
                style={[styles.input, styles.priceInput]}
              />
              <Text style={styles.priceSuffix}>/月</Text>
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
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceSymbol: {
      fontSize: 16,
      color: c.textPrimary,
      marginRight: 8,
    },
    priceInput: {
      flex: 1,
      marginBottom: 0,
    },
    priceSuffix: {
      fontSize: 14,
      color: c.textSecondary,
      marginLeft: 8,
    },
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
