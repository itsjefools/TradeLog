import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { openAffiliate } from '@/lib/affiliate';
import { colorFromString } from '@/lib/cover-color';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Broker = {
  id: string;
  name: string;
  tagline_ja: string | null;
  tagline_en: string | null;
  tagline_pt: string | null;
  tagline_es: string | null;
  features_ja: string | null;
  features_en: string | null;
  features_pt: string | null;
  features_es: string | null;
  badge_ja: string | null;
  badge_en: string | null;
  badge_pt: string | null;
  badge_es: string | null;
  logo_url: string | null;
  affiliate_url_ja: string | null;
  affiliate_url_en: string | null;
  affiliate_url_pt: string | null;
  affiliate_url_es: string | null;
  rating: number;
};

function pick(
  broker: Broker,
  field: 'tagline' | 'features' | 'badge' | 'affiliate_url',
  lang: Locale,
): string | null {
  const v = broker[`${field}_${lang}` as keyof Broker];
  if (typeof v === 'string' && v.length > 0) return v;
  const en = broker[`${field}_en` as keyof Broker];
  if (typeof en === 'string' && en.length > 0) return en;
  const ja = broker[`${field}_ja` as keyof Broker];
  if (typeof ja === 'string' && ja.length > 0) return ja;
  return null;
}

export function SchoolBrokers() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('school_brokers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setBrokers((data ?? []) as Broker[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = (broker: Broker) => {
    void openAffiliate(pick(broker, 'affiliate_url', lang), {
      kind: 'broker',
      itemId: broker.id,
    });
  };

  const renderStars = (rating: number) => {
    const filled = Math.round(rating);
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= filled ? 'star' : 'star-outline'}
          size={12}
          color={i <= filled ? c.star : c.textSecondary}
          style={styles.starIcon}
        />,
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={brokers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        brokers.length > 0 ? (
          <Text style={styles.intro}>{t('school.brokersIntro')}</Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="card-outline" size={28} color={c.textSecondary} />
          </View>
          <Text style={styles.emptyText}>{t('school.emptyBrokers')}</Text>
        </View>
      }
      ListFooterComponent={
        brokers.length > 0 ? (
          <Text style={styles.disclosure}>{t('school.affiliateDisclosure')}</Text>
        ) : null
      }
      renderItem={({ item }) => {
        const tagline = pick(item, 'tagline', lang);
        const badge = pick(item, 'badge', lang);
        const features = (pick(item, 'features', lang) ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          <View style={styles.card}>
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>{t('school.pr_label')}</Text>
            </View>

            <View style={styles.cardHead}>
              {item.logo_url ? (
                <Image source={{ uri: item.logo_url }} style={styles.logo} contentFit="contain" />
              ) : (
                <View
                  style={[
                    styles.logoPlaceholder,
                    { backgroundColor: colorFromString(item.name) },
                  ]}
                >
                  <Text style={styles.logoInitial}>{item.name.slice(0, 1)}</Text>
                </View>
              )}
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {badge ? (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                {item.rating > 0 ? (
                  <View style={styles.ratingRow}>
                    {renderStars(item.rating)}
                    <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}

            {features.length > 0 ? (
              <View style={styles.features}>
                {features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={15} color={c.accent} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => handleOpen(item)}
              activeOpacity={0.85}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{t('school.openAccount')}</Text>
              <Ionicons name="open-outline" size={16} color={c.onAccent} />
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    flex: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 14 },
    intro: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginBottom: 2 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      position: 'relative',
    },
    prBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    prBadgeText: { fontSize: 9, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.6 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 36 },
    logo: { width: 44, height: 44, borderRadius: 10, backgroundColor: c.surfaceAlt },
    logoPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    name: { fontSize: 17, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.2 },
    tagBadge: {
      backgroundColor: `${c.accent}1A`,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tagBadgeText: { fontSize: 10, fontWeight: '800', color: c.accent },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ratingValue: { fontSize: 11, color: c.textSecondary, marginLeft: 4 },
    starsRow: { flexDirection: 'row' },
    starIcon: { marginRight: 1 },
    tagline: { fontSize: 14, color: c.textPrimary, lineHeight: 20, marginTop: 12 },
    features: { marginTop: 12, gap: 8 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    featureText: { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 13,
      marginTop: 16,
    },
    ctaText: { fontSize: 15, fontWeight: '700', color: c.onAccent },
    emptyWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40 },
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
    disclosure: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 17,
      opacity: 0.7,
      paddingTop: 16,
      paddingBottom: 8,
    },
  });
}
