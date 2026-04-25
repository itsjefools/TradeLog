import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();

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
  const initial = email.charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>プロフィール</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.username}>@trader</Text>
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

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </View>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
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
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: TEXT_SECONDARY,
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
