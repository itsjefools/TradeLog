import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors, ThemeMode } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { tradeStyleLabel } from '@/lib/types';

export default function ProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const { profile, loading, refresh } = useProfile();
  const { mode, setMode } = useTheme();

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

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'システム連動' },
    { value: 'light', label: 'ライト' },
    { value: 'dark', label: 'ダーク' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>プロフィール</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
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

        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>テーマ</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const selected = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.themeChip, selected && styles.themeChipSelected]}
                  onPress={() => setMode(opt.value)}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      selected && styles.themeChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
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
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
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
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.accent,
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
    editButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.accent,
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
    settingsCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
    },
    settingsLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    themeChipSelected: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    themeChipText: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '500',
    },
    themeChipTextSelected: {
      color: '#fff',
      fontWeight: '700',
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
