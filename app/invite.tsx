import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GoldButton } from '@/components/gold-button';
import { DarkLuxBg, GoldGradient, LightLuxBg } from '@/components/gold-gradient';
import { useToast } from '@/components/toast';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { PLAN_COLORS } from '@/lib/design';
import { notifySuccess } from '@/lib/haptics';
import { isBonusPremiumActive } from '@/lib/premium';
import { supabase } from '@/lib/supabase';

/** ヒーローの静的装飾：ダーク=金スパークル / ライト=金コンフェッティ（リファレンス準拠） */
function HeroDecor({ isDark }: { isDark: boolean }) {
  if (isDark) {
    const sparkles: { top: number; left?: number; right?: number; size: number; op: number }[] = [
      { top: 16, left: 26, size: 13, op: 0.75 },
      { top: 30, right: 30, size: 9, op: 0.5 },
      { top: 12, right: 64, size: 6, op: 0.4 },
      { top: 64, left: 20, size: 8, op: 0.5 },
      { top: 74, right: 26, size: 11, op: 0.6 },
      { top: 48, left: 54, size: 6, op: 0.35 },
    ];
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {sparkles.map((s, i) => (
          <Ionicons
            key={i}
            name="sparkles"
            size={s.size}
            color="#E8C97A"
            style={{ position: 'absolute', top: s.top, left: s.left, right: s.right, opacity: s.op }}
          />
        ))}
      </View>
    );
  }
  const confetti: { top: number; left?: number; right?: number; w: number; h: number; rot: string; bg: string }[] = [
    { top: 16, left: 34, w: 11, h: 5, rot: '22deg', bg: '#E8C97A' },
    { top: 24, right: 40, w: 8, h: 4, rot: '-16deg', bg: '#D4A855' },
    { top: 44, left: 24, w: 7, h: 7, rot: '32deg', bg: '#F0D070' },
    { top: 60, right: 30, w: 9, h: 4, rot: '-26deg', bg: '#E8C97A' },
    { top: 74, left: 44, w: 7, h: 4, rot: '12deg', bg: '#D4A855' },
    { top: 30, left: 64, w: 5, h: 5, rot: '42deg', bg: '#F0D070' },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {confetti.map((cf, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: cf.top,
            left: cf.left,
            right: cf.right,
            width: cf.w,
            height: cf.h,
            backgroundColor: cf.bg,
            borderRadius: 1.5,
            opacity: 0.85,
            transform: [{ rotate: cf.rot }],
          }}
        />
      ))}
    </View>
  );
}

export default function InviteScreen() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const k = isDark ? 'dark' : 'light';
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { profile, refresh } = useProfile();
  const c = PLAN_COLORS;

  const inviteCode = profile?.referral_code ?? '';
  const bonusActive = isBonusPremiumActive(profile?.bonus_premium_until);
  const proBonusDays =
    bonusActive && profile?.bonus_premium_until
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.bonus_premium_until).getTime() - Date.now()) / 86400000,
          ),
        )
      : 0;
  const alreadyReferred = !!profile?.referred_by;

  const [invitedCount, setInvitedCount] = useState<number | null>(null);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const loadCount = useCallback(async () => {
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', profile?.id ?? '');
    setInvitedCount(count ?? 0);
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) loadCount();
  }, [profile?.id, loadCount]);

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({ message: t('invite.shareMessage', { code: inviteCode }) });
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

  return (
    <View style={[styles.container, { backgroundColor: c.screenBg[k] }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary[k]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary[k] }]}>
          {t('invite.title')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ヒーロー：漆黒/白地 + ゴールド放射グロー + 金属ギフト章 */}
        <View
          style={[
            styles.heroSection,
            { backgroundColor: c.inviteHeroBg[k], borderColor: c.inviteHeroBorder[k] },
          ]}
        >
          {isDark ? <DarkLuxBg id="inviteHeroBg" /> : <LightLuxBg id="inviteHeroBg" />}
          <HeroDecor isDark={isDark} />

          <View style={styles.giftIconContainer}>
            <View style={styles.giftCircle}>
              <GoldGradient id="inviteGift" />
              <Ionicons name="gift" size={30} color="#3A2E0A" />
            </View>
          </View>

          <Text
            style={[styles.heroTitle, { color: isDark ? c.goldLight : c.goldDark }]}
          >
            {t('invite.heroTitle')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: c.textSecondary[k] }]}>
            {t('invite.heroSub')}
          </Text>

          <View style={styles.codeBoxWrapper}>
            <TouchableOpacity
              style={[
                styles.codeBox,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : '#FFFFFF',
                  borderColor: isDark
                    ? 'rgba(212, 168, 85, 0.28)'
                    : 'rgba(212, 168, 85, 0.20)',
                },
                !isDark && styles.codeBoxShadow,
              ]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={[styles.codeLabel, { color: c.gold }]}>{t('invite.yourCode')}</Text>
              <View style={styles.codeRow}>
                <Text
                  style={[styles.codeText, { color: c.textPrimary[k] }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {inviteCode || '— — — —'}
                </Text>
                <Ionicons name="copy-outline" size={20} color={c.gold} />
              </View>
              <View style={styles.tapToShareRow}>
                <Ionicons name="share-social-outline" size={13} color={c.textSecondary[k]} />
                <Text style={[styles.tapToShare, { color: c.textSecondary[k] }]}>
                  {t('invite.tapToShare')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* コードを共有（金属ゴールドのグラデ） */}
        <GoldButton
          onPress={handleShare}
          disabled={!inviteCode}
          style={styles.shareButton}
          gradientId="inviteShare"
        >
          <Ionicons name="share-social-outline" size={18} color="#3A2E0A" />
          <Text style={styles.shareButtonText}>{t('invite.share')}</Text>
        </GoldButton>

        {/* 統計 */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: c.statCardBg[k], borderColor: c.statCardBorder[k] },
            ]}
          >
            <Ionicons name="people" size={24} color={c.gold} />
            <Text style={[styles.statNumber, { color: isDark ? c.gold : c.textPrimary[k] }]}>
              {invitedCount ?? '—'}
            </Text>
            <Text style={[styles.statLabel, { color: c.textSecondary[k] }]}>
              {t('invite.invited')}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: c.statCardBg[k], borderColor: c.statCardBorder[k] },
            ]}
          >
            <Ionicons name="sparkles" size={22} color={c.gold} />
            <Text style={[styles.statNumber, { color: isDark ? c.gold : c.textPrimary[k] }]}>
              {proBonusDays > 0 ? `${proBonusDays}日` : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: c.textSecondary[k] }]}>
              {proBonusDays > 0 ? t('invite.proDaysLeft') : t('invite.bonusNone')}
            </Text>
          </View>
        </View>

        {/* 使い方 */}
        <Text style={[styles.howToTitle, { color: c.textPrimary[k] }]}>
          {t('invite.howTitle')}
        </Text>

        {[
          { num: '1', icon: 'share-social-outline' as const, text: t('invite.step1') },
          { num: '2', icon: 'log-in-outline' as const, text: t('invite.step2') },
          { num: '3', icon: 'sparkles-outline' as const, text: t('invite.step3') },
        ].map((step, index) => (
          <View
            key={step.num}
            style={[
              styles.stepRow,
              { backgroundColor: c.cardBg[k], borderColor: c.statCardBorder[k] },
              index > 0 && { marginTop: 8 },
            ]}
          >
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: isDark ? 'rgba(212,168,85,0.15)' : 'rgba(212,168,85,0.12)' },
              ]}
            >
              <Text style={[styles.stepNumberText, { color: c.gold }]}>{step.num}</Text>
            </View>
            <Ionicons name={step.icon} size={18} color={c.textSecondary[k]} style={styles.stepIcon} />
            <Text style={[styles.stepText, { color: c.textPrimary[k] }]}>{step.text}</Text>
          </View>
        ))}

        {/* コードを使う（被招待者・未使用時のみ） */}
        {!alreadyReferred && (
          <>
            <Text style={[styles.howToTitle, { color: c.textPrimary[k], marginTop: 28 }]}>
              {t('invite.haveCode')}
            </Text>
            <View style={styles.redeemRow}>
              <TextInput
                style={[
                  styles.redeemInput,
                  {
                    backgroundColor: c.cardBg[k],
                    borderColor: c.statCardBorder[k],
                    color: c.textPrimary[k],
                  },
                ]}
                value={redeemInput}
                onChangeText={setRedeemInput}
                placeholder={t('invite.codePlaceholder')}
                placeholderTextColor={c.textMuted[k]}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!redeeming}
              />
              <TouchableOpacity
                style={[
                  styles.redeemButton,
                  { backgroundColor: c.shareButton[k] },
                  (redeeming || !redeemInput.trim()) && { opacity: 0.5 },
                ]}
                onPress={redeem}
                disabled={redeeming || !redeemInput.trim()}
                activeOpacity={0.7}
              >
                {redeeming ? (
                  <ActivityIndicator color={c.shareButtonText[k]} />
                ) : (
                  <Text style={[styles.redeemButtonText, { color: c.shareButtonText[k] }]}>
                    {t('invite.redeem')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.note, { color: c.textMuted[k] }]}>{t('invite.note')}</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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

  heroSection: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sparkle: { position: 'absolute', fontWeight: '300' },
  giftIconContainer: { marginBottom: 16 },
  giftCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4A855',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  codeBoxWrapper: { width: '100%', alignItems: 'center' },
  codeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  codeBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  codeBoxShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#8B6914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  codeText: { fontSize: 30, fontWeight: '800', letterSpacing: 5, fontVariant: ['tabular-nums'] },
  tapToShareRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  tapToShare: { fontSize: 12 },

  shareButton: { marginTop: 16, marginBottom: 20 },
  shareButtonText: { fontSize: 15, fontWeight: '800', color: '#3A2E0A' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statIcon: { fontSize: 22 },
  statNumber: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12 },

  howToTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: '700' },
  stepIcon: { marginRight: 10 },
  stepText: { fontSize: 14, fontWeight: '500', flex: 1 },

  redeemRow: { flexDirection: 'row', gap: 10 },
  redeemInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    letterSpacing: 2,
  },
  redeemButton: {
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, marginTop: 10, lineHeight: 18 },
});
