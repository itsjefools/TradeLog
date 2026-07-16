import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GOLD, ThemeColors } from '@/constants/theme';
import { CommunityFeatureGate } from '@/components/community-feature-gate';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Status = 'unverified' | 'pending' | 'verified' | 'rejected';

export default function CommunityPayoutScreen() {
  return (
    <CommunityFeatureGate>
      <CommunityPayoutContent />
    </CommunityFeatureGate>
  );
}

function CommunityPayoutContent() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);

  const [status, setStatus] = useState<Status>('unverified');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('creator_payout_accounts')
      .select('status, payouts_enabled')
      .eq('user_id', myId)
      .maybeSingle();
    if (data) {
      setStatus(
        data.payouts_enabled ? 'verified' : ((data.status as Status) ?? 'unverified'),
      );
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  // Stripe から最新状態を取得して同期。
  const refreshStatus = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('creator-connect', {
      body: { action: 'status' },
    });
    if (error) {
      const code = (error as { context?: Response }).context?.status ?? 0;
      if (code === 503) setNotConfigured(true);
      return;
    }
    if (data?.status) setStatus(data.status as Status);
  }, []);

  const startOnboarding = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('creator-connect', {
        body: { action: 'link' },
      });
      if (error) {
        const code = (error as { context?: Response }).context?.status ?? 0;
        if (code === 503) {
          setNotConfigured(true);
        } else {
          Alert.alert(t('common.error'), t('community.payout_open_failed'));
        }
        return;
      }
      const url = (data as { url?: string } | null)?.url;
      if (!url) {
        Alert.alert(t('common.error'), t('community.payout_open_failed'));
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      // 戻ってきたら最新状態を取得。
      await refreshStatus();
    } finally {
      setWorking(false);
    }
  };

  const ready = status === 'verified';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('community.payout_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* 状態カード */}
          <View style={styles.statusCard}>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: ready ? `${c.accent}1F` : `${GOLD}1F` },
              ]}
            >
              <Ionicons
                name={ready ? 'checkmark-circle' : 'card-outline'}
                size={26}
                color={ready ? c.accent : GOLD}
              />
            </View>
            <Text style={styles.statusTitle}>
              {ready
                ? t('community.payout_verified')
                : status === 'pending'
                  ? t('community.payout_pending')
                  : t('community.payout_unverified')}
            </Text>
            <Text style={styles.statusDesc}>
              {ready
                ? t('community.payout_ready_note')
                : t('community.payout_setup_note')}
            </Text>
          </View>

          {notConfigured ? (
            <Text style={styles.note}>{t('community.payout_not_configured')}</Text>
          ) : (
            <>
              <TouchableOpacity
                onPress={startOnboarding}
                disabled={working}
                activeOpacity={0.85}
                style={[styles.cta, working && styles.ctaDisabled]}
              >
                {working ? (
                  <ActivityIndicator color={c.onAccent} />
                ) : (
                  <Text style={styles.ctaText}>
                    {ready
                      ? t('community.payout_manage')
                      : t('community.payout_connect_cta')}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.secureRow}>
                <Ionicons name="lock-closed" size={13} color={c.textSecondary} />
                <Text style={styles.secureText}>
                  {t('community.payout_connect_desc')}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
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
    headerSpacer: { width: 26 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 20 },
    statusCard: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingVertical: 28,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    statusIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    statusTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
    statusDesc: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 19,
    },
    cta: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { fontSize: 15, fontWeight: '800', color: c.onAccent },
    secureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 14,
      paddingHorizontal: 4,
    },
    secureText: {
      flex: 1,
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
      opacity: 0.85,
    },
    note: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 20,
    },
  });
}
