import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { notifySuccess } from '@/lib/haptics';
import { isBonusPremiumActive } from '@/lib/premium';
import { supabase } from '@/lib/supabase';

export default function InviteScreen() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { profile, refresh } = useProfile();

  const code = profile?.referral_code ?? '';
  const bonusActive = isBonusPremiumActive(profile?.bonus_premium_until);
  const [count, setCount] = useState<number | null>(null);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const alreadyReferred = !!profile?.referred_by;

  const loadCount = useCallback(async () => {
    const { count: n } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', profile?.id ?? '');
    setCount(n ?? 0);
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) loadCount();
  }, [profile?.id, loadCount]);

  const share = async () => {
    try {
      await Share.share({
        message: t('invite.shareMessage', { code }),
      });
    } catch {
      /* noop */
    }
  };

  const redeem = async () => {
    const v = redeemInput.trim();
    if (!v) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc('redeem_referral', { code: v });
      if (error) throw new Error(error.message);
      const res = data as { ok: boolean; error?: string; reward_days?: number };
      if (res.ok) {
        notifySuccess();
        toast.success(t('invite.redeemSuccess', { days: res.reward_days ?? 0 }));
        setRedeemInput('');
        await refresh();
      } else {
        toast.error(t(`invite.err_${res.error}`));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRedeeming(false);
    }
  };

  const bonusUntilLabel = useMemo(() => {
    if (!profile?.bonus_premium_until) return '';
    try {
      return new Date(profile.bonus_premium_until).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : locale,
      );
    } catch {
      return '';
    }
  }, [profile?.bonus_premium_until, locale]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('invite.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Ionicons name="gift" size={36} color={c.accent} />
          <Text style={styles.heroTitle}>{t('invite.heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('invite.heroSub')}</Text>
        </View>

        {/* 自分のコード */}
        <Text style={styles.label}>{t('invite.yourCode')}</Text>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{code || '—'}</Text>
        </View>
        <Pressable style={styles.shareBtn} onPress={share} disabled={!code}>
          <Ionicons name="share-social" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>{t('invite.share')}</Text>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{count ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('invite.invited')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, bonusActive && { color: c.accent }]}>
              {bonusActive ? t('invite.active') : '—'}
            </Text>
            <Text style={styles.statLabel}>
              {bonusActive ? `Premium ~${bonusUntilLabel}` : t('invite.bonusNone')}
            </Text>
          </View>
        </View>

        {/* コードを使う（被招待者） */}
        {!alreadyReferred && (
          <>
            <Text style={[styles.label, { marginTop: 28 }]}>
              {t('invite.haveCode')}
            </Text>
            <View style={styles.redeemRow}>
              <TextInput
                style={styles.input}
                value={redeemInput}
                onChangeText={setRedeemInput}
                placeholder={t('invite.codePlaceholder')}
                placeholderTextColor={c.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!redeeming}
              />
              <Pressable
                style={[styles.redeemBtn, (redeeming || !redeemInput.trim()) && { opacity: 0.5 }]}
                onPress={redeem}
                disabled={redeeming || !redeemInput.trim()}
              >
                {redeeming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.redeemBtnText}>{t('invite.redeem')}</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.note}>{t('invite.note')}</Text>
          </>
        )}
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    body: { padding: 20, paddingBottom: 48 },
    hero: { alignItems: 'center', gap: 6, marginBottom: 24 },
    heroTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 6 },
    heroSub: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8 },
    codeBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
      paddingVertical: 18,
      alignItems: 'center',
    },
    code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: c.textPrimary },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 12,
    },
    shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    statBox: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    statLabel: { fontSize: 11, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
    redeemRow: { flexDirection: 'row', gap: 10 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.textPrimary,
      letterSpacing: 2,
    },
    redeemBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    redeemBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    note: { fontSize: 12, color: c.textSecondary, marginTop: 10, lineHeight: 18 },
  });
}
