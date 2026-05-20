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

import { ThemeColors } from '@/constants/theme';
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
        data={communities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.subtitleWrap}>
            <Text style={styles.subtitle}>{t('community.subtitle')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMember = myCommunityIds.has(item.id);
          return (
            <TouchableOpacity
              onPress={() => router.push(`/school/community/${item.id}`)}
              activeOpacity={0.7}
              style={styles.card}
            >
              <View style={styles.cardInner}>
                {item.cover_image_url ? (
                  <Image
                    source={{ uri: item.cover_image_url }}
                    style={styles.cardImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="people" size={22} color={c.accent} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {isMember && (
                      <View style={styles.joinedBadge}>
                        <Text style={styles.joinedBadgeText}>
                          {t('community.joined')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.cardMetaRow}>
                    <Ionicons
                      name="people-outline"
                      size={12}
                      color={c.textSecondary}
                    />
                    <Text style={styles.cardMembers}>
                      {item.member_count} {t('community.members')}
                    </Text>
                    <View style={styles.metaDot} />
                    {item.is_paid ? (
                      <Text style={styles.cardPaid}>
                        ¥{item.monthly_price.toLocaleString()}/月
                      </Text>
                    ) : (
                      <Text style={styles.cardFree}>{t('community.free')}</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>{t('community.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('community.empty_desc')}</Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => router.push('/school/community/create')}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color={c.onAccent} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    subtitleWrap: { marginBottom: 16 },
    subtitle: { fontSize: 14, color: c.textSecondary },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    cardInner: { flexDirection: 'row', alignItems: 'center' },
    cardImage: {
      width: 48,
      height: 48,
      borderRadius: 12,
      marginRight: 14,
      backgroundColor: c.surfaceAlt,
    },
    cardIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      marginRight: 14,
      backgroundColor: `${c.accent}1F`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBody: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
    cardName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
    },
    joinedBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: `${c.accent}26`,
      marginLeft: 8,
    },
    joinedBadgeText: { fontSize: 10, fontWeight: '700', color: c.accent },
    cardDesc: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    cardMembers: {
      fontSize: 12,
      color: c.textSecondary,
      marginLeft: 4,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.textSecondary,
      marginHorizontal: 8,
    },
    cardPaid: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
    cardFree: { fontSize: 12, color: c.accent, fontWeight: '600' },
    emptyWrap: { alignItems: 'center', paddingTop: 40 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
    },
    emptyDesc: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}
