import { Router, useRouter } from 'expo-router';
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
import { Profile, tradeStyleLabel } from '@/lib/types';

export default function SearchScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      const pattern = `%${trimmed}%`;
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .limit(30);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setResults((data ?? []) as Profile[]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.headerLink}>閉じる</Text>
        </Pressable>
        <Text style={styles.headerTitle}>ユーザー検索</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="ユーザー名・表示名で検索"
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
          <Text style={styles.hint}>検索欄に名前を入力してください</Text>
        )}

        {!loading && query.trim() !== '' && results.length === 0 && !error && (
          <Text style={styles.hint}>該当するユーザーが見つかりません</Text>
        )}

        {results.map((p) => (
          <UserRow key={p.id} profile={p} router={router} />
        ))}
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
              <Text style={styles.verifiedBadgeText}>✓</Text>
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLink: {
      fontSize: 15,
      color: c.textSecondary,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
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
    body: {
      padding: 16,
      gap: 8,
    },
    errorBox: {
      backgroundColor: '#7F1D1D',
      padding: 12,
      borderRadius: 8,
    },
    errorText: {
      color: '#FECACA',
      fontSize: 13,
    },
    loadingBox: {
      paddingVertical: 24,
      alignItems: 'center',
    },
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
    userRowPressed: {
      opacity: 0.7,
    },
    userInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    displayName: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    verifiedBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    username: {
      fontSize: 12,
      color: c.textSecondary,
    },
    metaSep: {
      fontSize: 12,
      color: c.textSecondary,
    },
    flag: {
      fontSize: 13,
    },
    metaText: {
      fontSize: 12,
      color: c.textSecondary,
    },
  });
}
