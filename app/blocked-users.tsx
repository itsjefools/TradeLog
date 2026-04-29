import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeColors } from '@/constants/theme';
import { useBlocks } from '@/hooks/use-blocks';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

export default function BlockedUsersScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { blockedIds, unblock, refresh: refreshBlocks } = useBlocks();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (blockedIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', blockedIds);
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  }, [blockedIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleUnblock = (target: Profile) => {
    Alert.alert(
      'ブロックを解除',
      `${target.display_name?.trim() || target.username || 'このユーザー'} のブロックを解除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除',
          onPress: async () => {
            try {
              await unblock(target.id);
              await refreshBlocks();
              setProfiles((prev) => prev.filter((p) => p.id !== target.id));
            } catch (e) {
              Alert.alert(
                'エラー',
                e instanceof Error ? e.message : String(e),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>ブロック中のユーザー</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={36}
            color={c.textSecondary}
          />
          <Text style={styles.emptyTitle}>ブロック中のユーザーはいません</Text>
          <Text style={styles.emptyText}>
            ユーザープロフィールの「⋯」メニューから{'\n'}ブロックできます。
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {profiles.map((p) => {
            const fallbackName = p.email?.split('@')[0] ?? 'ユーザー';
            const displayName =
              p.display_name?.trim() || p.username?.trim() || fallbackName;
            const username = p.username?.trim() || fallbackName;
            return (
              <View key={p.id} style={styles.row}>
                <Avatar uri={p.avatar_url} displayName={displayName} size={40} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.rowUsername} numberOfLines={1}>
                    @{username}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleUnblock(p)}
                  style={({ pressed }) => [
                    styles.unblockButton,
                    pressed && styles.unblockButtonPressed,
                  ]}
                  hitSlop={6}
                >
                  <Text style={styles.unblockText}>解除</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
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
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: { width: 40 },
    body: {
      padding: 16,
      gap: 8,
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
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
    },
    emptyText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
    },
    rowInfo: { flex: 1 },
    rowName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    rowUsername: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    unblockButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    unblockButtonPressed: { opacity: 0.6 },
    unblockText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
    },
  });
}
