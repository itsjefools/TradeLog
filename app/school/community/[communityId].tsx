import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format-time';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

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
};

type CommunityPost = {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  image_urls: string[] | null;
  created_at: string;
  profiles: Profile | null;
};

export default function CommunityDetailScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);
  const listRef = useRef<FlatList<CommunityPost>>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postingText, setPostingText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) {
      setLoading(false);
      return;
    }
    const [{ data: comm }, memberRes] = await Promise.all([
      supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .maybeSingle(),
      myId
        ? supabase
            .from('community_members')
            .select('id')
            .eq('community_id', communityId)
            .eq('user_id', myId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCommunity((comm ?? null) as Community | null);
    setIsMember(!!memberRes.data);

    if (memberRes.data) {
      const { data: postData } = await supabase
        .from('community_posts')
        .select(`*, profiles:user_id (id, username, display_name, avatar_url, is_verified)`)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts((postData ?? []) as CommunityPost[]);
    }
    setLoading(false);
  }, [communityId, myId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = async () => {
    if (!community || !myId) return;
    if (community.is_paid) {
      // 有料コミュニティは IAP 経由 (本タスクでは課金フローを完結させない)
      Alert.alert(
        t('community.paid_join_title'),
        t('community.paid_join_body'),
      );
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: myId,
        role: 'member',
      });
      if (error) throw new Error(error.message);
      setIsMember(true);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('community.join_failed');
      Alert.alert(t('community.error'), msg);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!community || !myId) return;
    if (community.owner_id === myId) {
      Alert.alert(t('community.error'), t('community.owner_cannot_leave'));
      return;
    }
    Alert.alert(t('community.leave_confirm'), t('community.leave_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('community.leave'),
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('community_members')
            .delete()
            .eq('community_id', community.id)
            .eq('user_id', myId);
          setIsMember(false);
          setPosts([]);
        },
      },
    ]);
  };

  const handleSubmitPost = async () => {
    const text = postingText.trim();
    if (!text || !community || !myId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          community_id: community.id,
          user_id: myId,
          content: text,
        })
        .select(`*, profiles:user_id (id, username, display_name, avatar_url, is_verified)`)
        .single();
      if (error) throw new Error(error.message);
      setPostingText('');
      setPosts((prev) => [data as CommunityPost, ...prev]);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('community.post_failed');
      Alert.alert(t('community.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('community.tab_label')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.notFound}>{t('community.not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = community.owner_id === myId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {community.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={isMember ? posts : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.heroBlock}>
              {community.cover_image_url ? (
                <Image
                  source={{ uri: community.cover_image_url }}
                  style={styles.cover}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="people" size={32} color={c.accent} />
                </View>
              )}
              <Text style={styles.communityName}>{community.name}</Text>
              {community.description ? (
                <Text style={styles.communityDesc}>{community.description}</Text>
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons
                  name="people-outline"
                  size={12}
                  color={c.textSecondary}
                />
                <Text style={styles.metaText}>
                  {community.member_count} {t('community.members')}
                </Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>
                  {t(`community.cat_${community.category}`)}
                </Text>
              </View>

              {!isMember ? (
                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={joining}
                  activeOpacity={0.85}
                  style={[styles.joinButton, joining && styles.joinButtonDisabled]}
                >
                  {joining ? (
                    <ActivityIndicator color={c.onAccent} />
                  ) : community.is_paid ? (
                    <Text style={styles.joinButtonText}>
                      ¥{community.monthly_price.toLocaleString()}/月 ·{' '}
                      {t('community.join')}
                    </Text>
                  ) : (
                    <Text style={styles.joinButtonText}>{t('community.join')}</Text>
                  )}
                </TouchableOpacity>
              ) : !isOwner ? (
                <TouchableOpacity
                  onPress={handleLeave}
                  activeOpacity={0.7}
                  style={styles.leaveButton}
                >
                  <Text style={styles.leaveButtonText}>{t('community.leave')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ownerBadge}>
                  <Ionicons name="ribbon-outline" size={14} color={c.accent} />
                  <Text style={styles.ownerBadgeText}>
                    {t('community.you_are_owner')}
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => <PostRow item={item} c={c} t={t} />}
          ListEmptyComponent={
            isMember ? (
              <View style={styles.emptyPosts}>
                <Text style={styles.emptyPostsEmoji}>💬</Text>
                <Text style={styles.emptyPostsTitle}>
                  {t('community.no_posts')}
                </Text>
                <Text style={styles.emptyPostsDesc}>
                  {t('community.no_posts_desc')}
                </Text>
              </View>
            ) : null
          }
        />

        {isMember && (
          <View style={styles.composer}>
            <TextInput
              value={postingText}
              onChangeText={setPostingText}
              placeholder={t('community.post_placeholder')}
              placeholderTextColor={c.textSecondary}
              style={styles.composerInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSubmitPost}
              disabled={!postingText.trim() || submitting}
              style={[
                styles.composerSend,
                (!postingText.trim() || submitting) &&
                  styles.composerSendDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={c.onAccent} size="small" />
              ) : (
                <Ionicons name="send" size={16} color={c.onAccent} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PostRow({
  item,
  c,
  t,
}: {
  item: CommunityPost;
  c: ThemeColors;
  t: (k: string) => string;
}) {
  const styles = useMemo(() => makeStyles(c), [c]);
  const profile = item.profiles;
  const fallbackName = profile?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  return (
    <View style={styles.postRow}>
      <Avatar
        uri={profile?.avatar_url}
        displayName={displayName}
        size={36}
        profile={profile}
      />
      <View style={styles.postBody}>
        <View style={styles.postHeaderRow}>
          <Text style={styles.postName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.postTime}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
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
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginHorizontal: 12,
    },
    headerSpacer: { width: 26 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFound: { fontSize: 14, color: c.textSecondary },
    listContent: { paddingBottom: 24 },
    heroBlock: {
      padding: 20,
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    cover: {
      width: 72,
      height: 72,
      borderRadius: 18,
      marginBottom: 12,
      backgroundColor: c.surfaceAlt,
    },
    coverPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 18,
      marginBottom: 12,
      backgroundColor: `${c.accent}1F`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    communityName: {
      fontSize: 22,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.4,
      textAlign: 'center',
    },
    communityDesc: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    metaText: {
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
    joinButton: {
      marginTop: 16,
      backgroundColor: c.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 999,
      minWidth: 180,
      alignItems: 'center',
    },
    joinButtonDisabled: { opacity: 0.6 },
    joinButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.onAccent,
    },
    leaveButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    leaveButtonText: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
    },
    ownerBadge: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: `${c.accent}1A`,
    },
    ownerBadgeText: { fontSize: 12, color: c.accent, fontWeight: '700' },
    postRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    postBody: { flex: 1 },
    postHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    postName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
    },
    postTime: {
      fontSize: 11,
      color: c.textSecondary,
      marginLeft: 8,
    },
    postContent: {
      fontSize: 14,
      color: c.textPrimary,
      marginTop: 4,
      lineHeight: 20,
    },
    emptyPosts: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
    emptyPostsEmoji: { fontSize: 40, marginBottom: 12 },
    emptyPostsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
    },
    emptyPostsDesc: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
      gap: 8,
    },
    composerInput: {
      flex: 1,
      maxHeight: 120,
      fontSize: 14,
      color: c.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: c.surfaceAlt,
    },
    composerSend: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerSendDisabled: { opacity: 0.4 },
  });
}
