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
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';

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
        {/* ギラギラ ヒーローカード */}
        <View style={styles.heroCard}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <SvgGrad id="gold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFE89A" />
                <Stop offset="0.45" stopColor="#E5B547" />
                <Stop offset="0.85" stopColor="#A07020" />
                <Stop offset="1" stopColor="#7A5618" />
              </SvgGrad>
              <SvgGrad id="shine" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
                <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
              </SvgGrad>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#gold)" rx="22" ry="22" />
            <Rect x="0" y="0" width="100%" height="55%" fill="url(#shine)" rx="22" ry="22" />
            <Path
              d="M30,90 L36,100 L46,103 L36,106 L30,116 L24,106 L14,103 L24,100 Z"
              fill="#FFF7D6"
              opacity={0.85}
            />
            <Path
              d="M280,55 L284,63 L292,65 L284,67 L280,75 L276,67 L268,65 L276,63 Z"
              fill="#FFF7D6"
              opacity={0.75}
            />
            <Path
              d="M260,170 L264,178 L272,180 L264,182 L260,190 L256,182 L248,180 L256,178 Z"
              fill="#FFF7D6"
              opacity={0.7}
            />
          </Svg>
          <View style={styles.heroInner}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={12} color="#7A5618" />
              <Text style={styles.heroBadgeText}>{t('invite.heroTitle')}</Text>
            </View>
            <Text style={styles.heroCardSub}>{t('invite.heroSub')}</Text>
            <Text style={styles.heroCodeLabel}>{t('invite.yourCode')}</Text>
            <Text style={styles.heroCode} numberOfLines={1} adjustsFontSizeToFit>
              {code || '—'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
          onPress={share}
          disabled={!code}
        >
          <Ionicons name="share-social" size={18} color="#1A1306" />
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
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8 },
    heroCard: {
      borderRadius: 22,
      paddingVertical: 28,
      paddingHorizontal: 22,
      marginBottom: 14,
      overflow: 'hidden',
      shadowColor: '#A07020',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
      minHeight: 220,
    },
    heroInner: { alignItems: 'center', gap: 6 },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,247,214,0.85)',
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#7A5618',
      letterSpacing: 0.4,
    },
    heroCardSub: {
      fontSize: 12,
      color: '#FFF7D6',
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 4,
      opacity: 0.9,
    },
    heroCodeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFF7D6',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginTop: 18,
      opacity: 0.8,
    },
    heroCode: {
      fontSize: 38,
      fontWeight: '900',
      letterSpacing: 6,
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      marginTop: 4,
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#FFD66B',
      borderRadius: 14,
      paddingVertical: 15,
      marginTop: 6,
      shadowColor: '#A07020',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    shareBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1306' },
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
