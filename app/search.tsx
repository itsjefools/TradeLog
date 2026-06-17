import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Router, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useBlocks } from '@/hooks/use-blocks';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Post, PROFILE_COLUMNS, Profile, Trade, tradeStyleLabel } from '@/lib/types';

type SearchMode = 'users' | 'tags';

type TagPost = Post & {
  trade: Trade | null;
  profile: Profile | null;
};

type TrendingTrader = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nationality: string | null;
  is_verified: boolean | null;
  trade_style: string | null;
  new_followers: number;
  score: number;
};

type TrendingTag = { tag: string; uses: number };

type RecentSearch = { term: string; mode: SearchMode };
const RECENTS_KEY = 'search_recents_v1';
const MAX_RECENTS = 8;

export default function SearchScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
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
  const [trendingTraders, setTrendingTraders] = useState<TrendingTrader[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const { isBlocked } = useBlocks();

  // 最近の検索を読み込み。
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY).then((raw) => {
      if (raw) {
        try {
          setRecents(JSON.parse(raw) as RecentSearch[]);
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  // 検索結果をタップしたときに最近の検索へ保存（同一語は先頭へ寄せ、最大8件）。
  const addRecent = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    setRecents((prev) => {
      const next = [
        { term, mode },
        ...prev.filter((r) => !(r.term === term && r.mode === mode)),
      ].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [query, mode]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    AsyncStorage.removeItem(RECENTS_KEY).catch(() => {});
  }, []);

  // 発見: 急上昇トレーダー & トレンドタグ（マウント時に取得）
  useEffect(() => {
    (async () => {
      const [traders, tags] = await Promise.all([
        supabase.rpc('get_trending_traders', { days: 7, top_n: 10 }),
        supabase.rpc('get_trending_hashtags', { days: 7, top_n: 12 }),
      ]);
      if (!traders.error)
        setTrendingTraders(
          ((traders.data ?? []) as TrendingTrader[]).filter(
            (tr) => !isBlocked(tr.user_id),
          ),
        );
      if (!tags.error) setTrendingTags((tags.data ?? []) as TrendingTag[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      try {
        if (mode === 'users') {
          const pattern = `%${trimmed}%`;
          const { data, error: fetchError } = await supabase
            .from('profiles')
            .select(PROFILE_COLUMNS)
            .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
            .limit(30);
          if (fetchError) setError(fetchError.message);
          else
            setUserResults(
              ((data ?? []) as Profile[]).filter((p) => !isBlocked(p.id)),
            );
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
          else
            setTagResults(
              ((data ?? []) as TagPost[]).filter(
                (p) => !isBlocked(p.user_id),
              ),
            );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mode, isBlocked]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
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
            {t('search.tabUsers')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'tags' && styles.tabActive]}
          onPress={() => setMode('tags')}
        >
          <Text
            style={[styles.tabText, mode === 'tags' && styles.tabTextActive]}
          >
            {t('search.tabTags')}
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
              ? t('search.placeholderUser')
              : t('search.placeholderHashtag')
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
          <>
            {recents.length > 0 && (
              <>
                <View style={styles.recentHead}>
                  <Text style={styles.discoverTitle}>{t('search.recent')}</Text>
                  <Pressable onPress={clearRecents} hitSlop={8}>
                    <Text style={styles.clearAll}>{t('search.clearAll')}</Text>
                  </Pressable>
                </View>
                {recents.map((r) => (
                  <Pressable
                    key={`${r.mode}:${r.term}`}
                    style={styles.recentRow}
                    onPress={() => {
                      setMode(r.mode);
                      setQuery(r.term);
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={c.textSecondary}
                    />
                    <Text style={styles.recentText} numberOfLines={1}>
                      {r.mode === 'tags' ? `#${r.term}` : r.term}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            {trendingTags.length > 0 && (
              <>
                <Text style={styles.discoverTitle}>
                  {t('search.trendingTags')}
                </Text>
                <View style={styles.tagCloud}>
                  {trendingTags.map((tg) => (
                    <Pressable
                      key={tg.tag}
                      style={styles.trendTag}
                      onPress={() => {
                        setMode('tags');
                        setQuery(tg.tag);
                      }}
                    >
                      <Text style={styles.trendTagText}>#{tg.tag}</Text>
                      <Text style={styles.trendTagCount}>{tg.uses}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {trendingTraders.length > 0 && (
              <>
                <Text style={styles.discoverTitle}>
                  {t('search.trendingTraders')}
                </Text>
                {trendingTraders.map((tr) => (
                  <TrendingTraderRow key={tr.user_id} trader={tr} router={router} />
                ))}
              </>
            )}

            {trendingTags.length === 0 && trendingTraders.length === 0 && (
              <Text style={styles.hint}>
                {mode === 'users'
                  ? t('search.emptyUserHint')
                  : t('search.emptyHashtagHint')}
              </Text>
            )}
          </>
        )}

        {!loading && query.trim() !== '' && (
          <>
            {mode === 'users' && userResults.length === 0 && !error && (
              <Text style={styles.hint}>{t('search.noUserFound')}</Text>
            )}
            {mode === 'users' &&
              userResults.map((p) => (
                <UserRow key={p.id} profile={p} router={router} onPick={addRecent} />
              ))}

            {mode === 'tags' && tagResults.length === 0 && !error && (
              <Text style={styles.hint}>{t('search.noPostFound')}</Text>
            )}
            {mode === 'tags' &&
              tagResults.map((p) => (
                <TagPostRow key={p.id} post={p} router={router} onPick={addRecent} />
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrendingTraderRow({
  trader,
  router,
}: {
  trader: TrendingTrader;
  router: Router;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = t('profile.defaultName');
  const displayName =
    trader.display_name?.trim() || trader.username?.trim() || fallbackName;
  const username = trader.username?.trim() || fallbackName;
  const flag = trader.nationality ? flagEmoji(trader.nationality) : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
      onPress={() => router.push(`/user/${trader.user_id}`)}
    >
      <Avatar
        uri={trader.avatar_url}
        displayName={displayName}
        size={48}
        profile={{
          username: trader.username,
          is_verified: trader.is_verified,
          nationality: trader.nationality,
          trade_style: trader.trade_style,
        }}
        onPress={() => router.push(`/user/${trader.user_id}`)}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {trader.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.username}>
          @{username}
          {flag !== '' ? `  ${flag}` : ''}
        </Text>
      </View>
      {trader.new_followers > 0 && (
        <View style={styles.trendUp}>
          <Ionicons name="trending-up" size={13} color={c.win} />
          <Text style={styles.trendUpText}>+{trader.new_followers}</Text>
        </View>
      )}
    </Pressable>
  );
}

function UserRow({
  profile,
  router,
  onPick,
}: {
  profile: Profile;
  router: Router;
  onPick?: () => void;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fallbackName = profile.email?.split('@')[0] ?? t('profile.defaultName');
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
      onPress={() => {
        onPick?.();
        router.push(`/user/${profile.id}`);
      }}
    >
      <Avatar
        uri={profile.avatar_url}
        displayName={displayName}
        size={48}
        profile={profile}
        onPress={() => router.push(`/user/${profile.id}`)}
      />
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

function TagPostRow({
  post,
  router,
  onPick,
}: {
  post: TagPost;
  router: Router;
  onPick?: () => void;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const profile = post.profile;
  const trade = post.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;

  return (
    <Pressable
      style={({ pressed }) => [styles.tagPost, pressed && styles.userRowPressed]}
      onPress={() => {
        onPick?.();
        router.push(`/comments?postId=${post.id}`);
      }}
    >
      <View style={styles.tagPostHead}>
        <Avatar
          uri={profile?.avatar_url}
          displayName={displayName}
          size={32}
          profile={profile}
          onPress={profile ? () => router.push(`/user/${profile.id}`) : undefined}
        />
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
            {trade.direction === 'long' ? t('common.long') : t('common.short')}
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
      borderRadius: 10,
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
    discoverTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 8,
      marginBottom: 10,
    },
    recentHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    clearAll: { fontSize: 12, color: c.accent, fontWeight: '600' },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    recentText: { flex: 1, fontSize: 14, color: c.textPrimary },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    trendTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    trendTagText: { fontSize: 13, fontWeight: '600', color: c.accent },
    trendTagCount: { fontSize: 11, color: c.textSecondary },
    trendUp: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    trendUpText: { fontSize: 12, fontWeight: '700', color: c.win },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
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
      borderRadius: 10,
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
