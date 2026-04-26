import { Ionicons } from '@expo/vector-icons';
import { Router, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Post, Profile, Trade, tradeStyleLabel } from '@/lib/types';

type SearchMode = 'users' | 'tags';

type TagPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

export default function SearchScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const params = useLocalSearchParams<{ tag?: string }>();
  const initialMode: SearchMode = params.tag ? 'tags' : 'users';
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState(params.tag ?? '');
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [tagResults, setTagResults] = useState<TagPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setUserResults([]);
      setTagResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      if (mode === 'users') {
        const pattern = `%${trimmed}%`;
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .limit(30);
        if (fetchError) setError(fetchError.message);
        else setUserResults((data ?? []) as Profile[]);
      } else {
        const tag = trimmed.replace(/^#/, '').toLowerCase();
        const { data, error: rpcError } = await supabase
          .from('posts')
          .select(
            `*,
            trade:trades!posts_trade_id_fkey (*),
            profile:profiles!posts_user_id_fkey (
              id, email, username, display_name, avatar_url, bio,
              trade_style, language, is_premium, nationality, is_verified, created_at
            )`,
          )
          .contains('hashtags', [tag])
          .order('created_at', { ascending: false })
          .limit(50);
        if (rpcError) setError(rpcError.message);
        else setTagResults((data ?? []) as TagPost[]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mode]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>検索</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'users' && styles.tabActive]}
          onPress={() => setMode('users')}
        >
          <Text
            style={[styles.tabText, mode === 'users' && styles.tabTextActive]}
          >
            ユーザー
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'tags' && styles.tabActive]}
          onPress={() => setMode('tags')}
        >
          <Text
            style={[styles.tabText, mode === 'tags' && styles.tabTextActive]}
          >
            ハッシュタグ
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={
            mode === 'users'
              ? 'ユーザー名・表示名で検索'
              : 'ハッシュタグで検索（例: USDJPY）'
          }
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={c.accent} />
          </View>
        )}

        {!loading && query.trim() === '' && (
          <Text style={styles.hint}>
            {mode === 'users'
              ? 'ユーザーを検索しましょう'
              : '#ハッシュタグで投稿を検索しましょう'}
          </Text>
        )}

        {!loading && query.trim() !== '' && (
          <>
            {mode === 'users' && userResults.length === 0 && !error && (
              <Text style={styles.hint}>該当するユーザーが見つかりません</Text>
            )}
            {mode === 'users' &&
              userResults.map((p) => (
                <UserRow key={p.id} profile={p} router={router} />
              ))}

            {mode === 'tags' && tagResults.length === 0 && !error && (
              <Text style={styles.hint}>該当する投稿が見つかりません</Text>
            )}
            {mode === 'tags' &&
              tagResults.map((p) => (
                <TagPostRow key={p.id} post={p} router={router} />
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UserRow({
  profile,
  router,
}: {
  profile: Profile;
  router: Router;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = profile.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile.display_name?.trim() ||
    profile.username?.trim() ||
    fallbackName;
  const username = profile.username?.trim() || fallbackName;
  const flag = profile.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile.nationality ?? null);
  const styleText = profile.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
      onPress={() => router.push(`/user/${profile.id}`)}
    >
      <Avatar uri={profile.avatar_url} displayName={displayName} size={48} />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {profile.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.username}>@{username}</Text>
          {flag !== '' && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.flag}>{flag}</Text>
              {country && <Text style={styles.metaText}>{country.name}</Text>}
            </>
          )}
          {styleText && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{styleText}</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function TagPostRow({ post, router }: { post: TagPost; router: Router }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const profile = post.profile;
  const trade = post.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;

  return (
    <Pressable
      style={({ pressed }) => [styles.tagPost, pressed && styles.userRowPressed]}
      onPress={() => router.push(`/comments?postId=${post.id}`)}
    >
      <View style={styles.tagPostHead}>
        <Avatar uri={profile?.avatar_url} displayName={displayName} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.username}>@{username}</Text>
        </View>
      </View>
      {trade && (
        <View style={styles.tagPostTrade}>
          <Text style={styles.tagPostPair}>{trade.currency_pair}</Text>
          <Text style={styles.tagPostDir}>
            {trade.direction === 'long' ? 'ロング' : 'ショート'}
          </Text>
        </View>
      )}
      {post.content && post.content.trim() !== '' && (
        <Text style={styles.tagPostContent} numberOfLines={3}>
          {post.content}
        </Text>
      )}
      {post.hashtags && post.hashtags.length > 0 && (
        <View style={styles.tagChips}>
          {post.hashtags.slice(0, 5).map((h) => (
            <View key={h} style={styles.tagChip}>
              <Text style={styles.tagChipText}>#{h}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
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
    headerLink: { fontSize: 15, color: c.textSecondary },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
    tabTextActive: { color: '#fff' },
    searchBox: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    searchInput: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.textPrimary,
    },
    body: { padding: 16, gap: 8 },
    errorBox: { backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8 },
    errorText: { color: '#FECACA', fontSize: 13 },
    loadingBox: { paddingVertical: 24, alignItems: 'center' },
    hint: {
      paddingVertical: 24,
      textAlign: 'center',
      fontSize: 13,
      color: c.textSecondary,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    userRowPressed: { opacity: 0.7 },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    displayName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    verifiedBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    username: { fontSize: 12, color: c.textSecondary },
    metaSep: { fontSize: 12, color: c.textSecondary },
    flag: { fontSize: 13 },
    metaText: { fontSize: 12, color: c.textSecondary },
    tagPost: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    tagPostHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tagPostTrade: { flexDirection: 'row', gap: 8 },
    tagPostPair: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    tagPostDir: { fontSize: 13, color: c.textSecondary },
    tagPostContent: { fontSize: 13, color: c.textPrimary, lineHeight: 18 },
    tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
    },
    tagChipText: { fontSize: 11, color: c.accent, fontWeight: '600' },
  });
}
