import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBlocks } from '@/hooks/use-blocks';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { Profile, tradeStyleLabel } from '@/lib/types';

const ACCENT = '#10B981';

type TabKey = 'followers' | 'following';

const PROFILE_FRAG = `
  id, email, username, display_name, avatar_url, bio,
  trade_style, language, is_premium, nationality, is_verified, created_at
`;

export default function FollowListScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { userId, tab: initialTab } = useLocalSearchParams<{
    userId: string;
    tab?: string;
  }>();
  const { session } = useAuth();
  const { isBlocked } = useBlocks();
  const myId = session?.user.id ?? null;

  const [tab, setTab] = useState<TabKey>(
    initialTab === 'following' ? 'following' : 'followers',
  );
  const [items, setItems] = useState<Profile[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // followers: 自分(=userId) を following している人 → follower_id を取得
      // following: 自分(=userId) が following している人 → following_id を取得
      const fkColumn = tab === 'followers' ? 'follower_id' : 'following_id';
      const filterColumn = tab === 'followers' ? 'following_id' : 'follower_id';

      const { data: rows, error } = await supabase
        .from('follows')
        .select(`${fkColumn}, profile:profiles!follows_${fkColumn}_fkey (${PROFILE_FRAG})`)
        .eq(filterColumn, userId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      type Row = { profile: Profile | null };
      const profiles = ((rows as unknown) as Row[] | null ?? [])
        .map((r) => r.profile)
        .filter((p): p is Profile => p !== null && !isBlocked(p.id));
      setItems(profiles);

      // 自分が誰をフォロー中か（フォローボタンの状態に使う）
      if (myId && profiles.length > 0) {
        const ids = profiles.map((p) => p.id);
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', myId)
          .in('following_id', ids);
        setFollowingSet(
          new Set(
            (myFollows ?? []).map((r: { following_id: string }) => r.following_id),
          ),
        );
      } else {
        setFollowingSet(new Set());
      }
    } catch (e) {
      Alert.alert('読み込み失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, tab, myId, isBlocked]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchTab = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    setItems([]);
    setQuery('');
  };

  const toggleFollow = async (target: Profile) => {
    if (!myId || target.id === myId) return;
    const wasFollowing = followingSet.has(target.id);
    // 楽観的更新
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
    setPendingId(target.id);
    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myId)
          .eq('following_id', target.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: myId, following_id: target.id });
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      // revert
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(target.id);
        else next.delete(target.id);
        return next;
      });
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setPendingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return items;
    return items.filter((p) => {
      const name = (p.display_name ?? '').toLowerCase();
      const username = (p.username ?? '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [items, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {tab === 'followers' ? 'フォロワー' : 'フォロー中'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => switchTab('followers')}
          style={[
            styles.tabButton,
            tab === 'followers' && styles.tabButtonActive,
          ]}
          hitSlop={4}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'followers' && styles.tabTextActive,
            ]}
          >
            フォロワー
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchTab('following')}
          style={[
            styles.tabButton,
            tab === 'following' && styles.tabButtonActive,
          ]}
          hitSlop={4}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'following' && styles.tabTextActive,
            ]}
          >
            フォロー中
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color={c.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="ユーザー名で絞り込み"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={16}
              color={c.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {tab === 'followers'
              ? 'フォロワーはまだいません'
              : 'まだ誰もフォローしていません'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <UserRow
              c={c}
              styles={styles}
              profile={item}
              isMyself={!!myId && myId === item.id}
              isFollowing={followingSet.has(item.id)}
              pending={pendingId === item.id}
              onToggleFollow={() => toggleFollow(item)}
              onPress={() => router.push(`/user/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function UserRow({
  c,
  styles,
  profile,
  isMyself,
  isFollowing,
  pending,
  onToggleFollow,
  onPress,
}: {
  c: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  profile: Profile;
  isMyself: boolean;
  isFollowing: boolean;
  pending: boolean;
  onToggleFollow: () => void;
  onPress: () => void;
}) {
  const fallbackName = profile.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile.display_name?.trim() || profile.username?.trim() || fallbackName;
  const username = profile.username?.trim() || fallbackName;
  const flag = profile.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile.nationality ?? null);
  const styleText = profile.trade_style
    ? tradeStyleLabel(profile.trade_style)
    : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Avatar
        uri={profile.avatar_url}
        displayName={displayName}
        size={40}
        profile={profile}
        onPress={onPress}
      />
      <View style={styles.info}>
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
        <View style={styles.metaRow}>
          <Text style={styles.username} numberOfLines={1}>
            @{username}
          </Text>
          {flag !== '' && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.flag}>{flag}</Text>
              {country && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {country.name}
                </Text>
              )}
            </>
          )}
          {styleText && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {styleText}
              </Text>
            </>
          )}
        </View>
      </View>
      {!isMyself && (
        <Pressable
          onPress={onToggleFollow}
          disabled={pending}
          style={({ pressed }) => [
            styles.followButton,
            isFollowing && styles.followButtonActive,
            pressed && !pending && styles.followButtonPressed,
            pending && styles.followButtonDisabled,
          ]}
          hitSlop={4}
        >
          {pending ? (
            <ActivityIndicator
              size="small"
              color={isFollowing ? c.textPrimary : '#fff'}
            />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                isFollowing && styles.followButtonTextActive,
              ]}
            >
              {isFollowing ? 'フォロー中' : 'フォロー'}
            </Text>
          )}
        </Pressable>
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 40 },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -StyleSheet.hairlineWidth,
    },
    tabButtonActive: {
      borderBottomColor: ACCENT,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    tabTextActive: {
      color: c.textPrimary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginTop: 12,
    },
    searchIcon: {},
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
      paddingVertical: 4,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 32,
      gap: 4,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    rowPressed: {
      opacity: 0.7,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    displayName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
      flexShrink: 1,
    },
    verifiedBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    username: {
      fontSize: 12,
      color: c.textSecondary,
    },
    metaSep: {
      fontSize: 12,
      color: c.textSecondary,
    },
    flag: { fontSize: 13 },
    metaText: {
      fontSize: 12,
      color: c.textSecondary,
    },
    followButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: ACCENT,
      minWidth: 84,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followButtonActive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    followButtonPressed: {
      opacity: 0.85,
    },
    followButtonDisabled: {
      opacity: 0.6,
    },
    followButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    followButtonTextActive: {
      color: c.textPrimary,
    },
  });
}
