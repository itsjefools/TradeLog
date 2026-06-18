import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CommunityBannerBg } from '@/components/school/community-banner-bg';
import { GoldGradient } from '@/components/gold-gradient';
import { Scrim } from '@/components/scrim';
import { GOLD, ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Community = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  is_paid: boolean;
  monthly_price: number;
  member_count: number;
  is_active: boolean;
};

const KNOWN_CATEGORIES = [
  'general',
  'strategy',
  'analysis',
  'beginner',
  'advanced',
] as const;

export function SchoolCommunity() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c), [c]);
  const myId = session?.user.id ?? null;
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunityIds, setMyCommunityIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const load = useCallback(async () => {
    const [{ data: comms }, { data: members }] = await Promise.all([
      supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false }),
      myId
        ? supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', myId)
        : Promise.resolve({ data: [] as { community_id: string }[] }),
    ]);
    setCommunities((comms ?? []) as Community[]);
    setMyCommunityIds(
      new Set((members ?? []).map((m) => m.community_id as string)),
    );
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  // 実在するカテゴリだけをフィルタに出す（「すべて」+ 既知カテゴリのうち存在するもの）。
  const availableCategories = useMemo(() => {
    const present = new Set(communities.map((x) => x.category));
    return ['all', ...KNOWN_CATEGORIES.filter((k) => present.has(k))];
  }, [communities]);

  const filtered = useMemo(
    () =>
      selectedCategory === 'all'
        ? communities
        : communities.filter((x) => x.category === selectedCategory),
    [communities, selectedCategory],
  );

  const catLabel = (cat: string): string =>
    (KNOWN_CATEGORIES as readonly string[]).includes(cat)
      ? t(`community.cat_${cat}`)
      : cat;

  // 最もメンバーの多いコミュニティを「人気」として強調（1件以上メンバーがいる場合のみ）。
  const topId = useMemo(() => {
    const top = communities[0];
    return top && top.member_count > 0 ? top.id : null;
  }, [communities]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.subtitle}>{t('community.subtitle')}</Text>
            {availableCategories.length > 1 && (
              <FlatList
                data={availableCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterList}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isActive = selectedCategory === item;
                  const label =
                    item === 'all' ? t('community.cat_all') : catLabel(item);
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedCategory(item)}
                      activeOpacity={0.8}
                      style={[
                        styles.filterChip,
                        isActive
                          ? styles.filterChipActive
                          : styles.filterChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive
                            ? styles.filterChipTextActive
                            : styles.filterChipTextInactive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isMember = myCommunityIds.has(item.id);
          const isPopular = item.id === topId;
          return (
            <TouchableOpacity
              onPress={() => router.push(`/school/community/${item.id}`)}
              activeOpacity={0.85}
              style={styles.card}
            >
              <View style={styles.banner}>
                {item.cover_image_url ? (
                  <Image
                    source={{ uri: item.cover_image_url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={StyleSheet.absoluteFill}>
                    <CommunityBannerBg name={item.name} />
                    <Ionicons
                      name="people"
                      size={64}
                      color="rgba(255,255,255,0.16)"
                      style={styles.bannerGhostIcon}
                    />
                  </View>
                )}
                <Scrim from={0.3} opacity={0.82} />

                <View style={styles.bannerTopRow}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {catLabel(item.category)}
                    </Text>
                  </View>
                  <View style={styles.topRightBadges}>
                    {isPopular && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="flame" size={11} color="#1A1407" />
                        <Text style={styles.popularBadgeText}>
                          {t('community.popular')}
                        </Text>
                      </View>
                    )}
                    {isMember && (
                      <View style={styles.joinedBadge}>
                        <Ionicons name="checkmark" size={11} color={c.onAccent} />
                        <Text style={styles.joinedBadgeText}>
                          {t('community.joined')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.bannerBottom}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.metaLeft}>
                  <Ionicons name="people" size={14} color={c.textSecondary} />
                  <Text style={styles.cardMembers}>
                    {item.member_count.toLocaleString()} {t('community.members')}
                  </Text>
                </View>
                {item.is_paid ? (
                  <View style={styles.priceTag}>
                    <Text style={styles.cardPaid}>
                      ¥{item.monthly_price.toLocaleString()}
                      <Text style={styles.cardPaidUnit}>/月</Text>
                    </Text>
                  </View>
                ) : (
                  <View style={styles.freeTag}>
                    <Text style={styles.cardFree}>{t('community.free')}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={30} color={c.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>{t('community.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('community.empty_desc')}</Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => router.push('/school/community/create')}
        activeOpacity={0.9}
        style={styles.fab}
      >
        <View style={styles.fabGold}>
          <GoldGradient id="communityFab" />
        </View>
        <Ionicons name="add" size={28} color="#1A1407" />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 110 },
    subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 14 },
    filterList: { gap: 8, paddingBottom: 18 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      marginRight: 8,
    },
    filterChipActive: { backgroundColor: c.accent },
    filterChipInactive: { backgroundColor: c.surfaceAlt },
    filterChipText: { fontSize: 13 },
    filterChipTextActive: { color: c.onAccent, fontWeight: '800' },
    filterChipTextInactive: { color: c.textSecondary, fontWeight: '600' },
    card: {
      borderRadius: 16,
      marginBottom: 14,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    banner: {
      height: 132,
      position: 'relative',
      justifyContent: 'flex-end',
      backgroundColor: c.surfaceAlt,
    },
    bannerGhostIcon: {
      position: 'absolute',
      right: 12,
      bottom: 4,
    },
    bannerTopRow: {
      position: 'absolute',
      top: 10,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    categoryTag: {
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    categoryTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.2,
    },
    topRightBadges: { flexDirection: 'row', gap: 6 },
    popularBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: GOLD,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },
    popularBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#1A1407',
      letterSpacing: 0.2,
    },
    joinedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.accent,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },
    joinedBadgeText: { fontSize: 10, fontWeight: '800', color: c.onAccent },
    bannerBottom: { paddingHorizontal: 14, paddingBottom: 12 },
    cardName: {
      fontSize: 19,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
    },
    cardDesc: {
      fontSize: 12.5,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 2,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMembers: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    priceTag: {
      backgroundColor: `${GOLD}1F`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cardPaid: { fontSize: 13, color: GOLD, fontWeight: '800' },
    cardPaidUnit: { fontSize: 10, fontWeight: '700' },
    freeTag: {
      backgroundColor: `${c.accent}1F`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cardFree: { fontSize: 12, color: c.accent, fontWeight: '800' },
    emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 40 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    emptyDesc: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      shadowColor: GOLD,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    fabGold: { ...StyleSheet.absoluteFillObject, borderRadius: 29, overflow: 'hidden' },
  });
}
