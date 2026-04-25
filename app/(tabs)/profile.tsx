import { Link } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { tradeStyleLabel } from '@/lib/types';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { profile, loading, refresh } = useProfile();

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
  const initial = (displayName.charAt(0) || '?').toUpperCase();

  const country = findCountry(profile?.nationality ?? null);
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const styleText = tradeStyleLabel(profile?.trade_style);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>プロフィール</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={undefined}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
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

          <Link href="/profile-edit" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
            >
              <Text style={styles.editButtonText}>プロフィールを編集</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>投稿</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>フォロワー</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
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

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_SECONDARY = '#94A3B8';
const DANGER = '#EF4444';
const VERIFIED_COLOR = '#3B82F6';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: VERIFIED_COLOR,
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
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
  },
  bio: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  editButtonPressed: {
    opacity: 0.85,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
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
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  retryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: DANGER,
  },
});
