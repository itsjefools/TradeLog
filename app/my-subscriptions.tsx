import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type SubRow = {
  id: string;
  status: 'active' | 'cancelled' | 'expired';
  store: string | null;
  current_period_end: string | null;
  communities: {
    name: string;
    cover_image_url: string | null;
    monthly_price: number;
  } | null;
};

// ストアの定期購入管理ページ（解約はここから）。
const STORE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export default function MySubscriptionsScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('community_subscriptions')
      .select(
        'id, status, store, current_period_end, communities(name, cover_image_url, monthly_price)',
      )
      .eq('subscriber_id', myId)
      .order('created_at', { ascending: false });
    setSubs((data ?? []) as unknown as SubRow[]);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: SubRow['status']) =>
    s === 'active'
      ? t('settings.subsActive')
      : s === 'cancelled'
        ? t('settings.subsCancelled')
        : t('settings.subsExpired');
  const statusColor = (s: SubRow['status']) =>
    s === 'active' ? c.accent : s === 'cancelled' ? c.star : c.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.subscriptions')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="card-outline" size={28} color={c.textSecondary} />
              </View>
              <Text style={styles.emptyText}>{t('settings.subsEmpty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.communities?.cover_image_url ? (
                <Image
                  source={{ uri: item.communities.cover_image_url }}
                  style={styles.cover}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="people" size={20} color={c.accent} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.communities?.name ?? '—'}
                </Text>
                <Text style={styles.cardPrice}>
                  ¥{(item.communities?.monthly_price ?? 0).toLocaleString()}/月
                </Text>
              </View>
              <View
                style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}1F` }]}
              >
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => Linking.openURL(STORE_SUBSCRIPTIONS_URL)}
                activeOpacity={0.85}
                style={styles.manageButton}
              >
                <Ionicons name="open-outline" size={16} color={c.textPrimary} />
                <Text style={styles.manageText}>
                  {t('settings.subsManage')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.note}>{t('settings.subsNote')}</Text>
            </View>
          }
        />
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
    listContent: { padding: 20 },
    emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 40 },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    cover: { width: 44, height: 44, borderRadius: 11, backgroundColor: c.surfaceAlt },
    coverPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 11,
      backgroundColor: `${c.accent}1F`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, marginLeft: 12 },
    cardName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    cardPrice: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    statusPill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: { fontSize: 11, fontWeight: '800' },
    footer: { marginTop: 10 },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    manageText: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    note: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
      marginTop: 12,
      opacity: 0.8,
    },
  });
}
