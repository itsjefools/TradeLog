import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { tradeStyleLabel } from '@/lib/types';

export default function ProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const { profile, loading, refresh } = useProfile();
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);

  const userId = session?.user.id;

  const loadCounts = useCallback(async () => {
    if (!userId) {
      setFollowerCount(0);
      setFollowingCount(0);
      setTradeCount(0);
      return;
    }
    const [followerRes, followingRes, tradesRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
      supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_shared', true),
    ]);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
    setTradeCount(tradesRes.count ?? 0);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  const handleLogout = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('エラー', error.message);
          }
        },
      },
    ]);
  };

  const email = session?.user.email ?? '';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split('@')[0] ||
    'ユーザー';
  const username = profile?.username?.trim() || email.split('@')[0] || 'user';

  const country = findCountry(profile?.nationality ?? null);
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const styleText = tradeStyleLabel(profile?.trade_style);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>プロフィール</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.settingsButtonPressed,
            ]}
            hitSlop={8}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Avatar
              uri={profile?.avatar_url}
              displayName={displayName}
              size={80}
            />
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {profile?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{username}</Text>

          <View style={styles.metaRow}>
            {flag !== '' && (
              <View style={styles.metaItem}>
                <Text style={styles.flag}>{flag}</Text>
                <Text style={styles.metaText}>
                  {country?.name ?? profile?.nationality ?? ''}
                </Text>
              </View>
            )}
            {profile?.trade_style && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>📊</Text>
                <Text style={styles.metaText}>{styleText}</Text>
              </View>
            )}
          </View>

          {profile?.bio && profile.bio.trim() !== '' && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tradeCount}</Text>
            <Text style={styles.statLabel}>共有取引</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followerCount}</Text>
            <Text style={styles.statLabel}>フォロワー</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followingCount}</Text>
            <Text style={styles.statLabel}>フォロー中</Text>
          </View>
        </View>

        {!loading && !profile && (
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>プロフィールを再読み込み</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLeft: {
      flex: 1,
    },
    settingsButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButtonPressed: {
      opacity: 0.7,
    },
    settingsIcon: {
      fontSize: Platform.OS === 'ios' ? 18 : 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 16,
    },
    profileCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    avatarWrap: {
      marginBottom: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    displayName: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    verifiedBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    username: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
      justifyContent: 'center',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    flag: {
      fontSize: 18,
    },
    metaLabel: {
      fontSize: 14,
    },
    metaText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    bio: {
      fontSize: 14,
      color: c.textPrimary,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingVertical: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    retryButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    retryText: {
      color: c.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    logoutButton: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    logoutButtonPressed: {
      opacity: 0.7,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.danger,
    },
  });
}
