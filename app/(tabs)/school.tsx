import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';

export default function SchoolScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>スクール</Text>
        <Text style={styles.subtitle}>FXの学びを深めましょう</Text>
      </View>

      <View style={styles.body}>
        <Link href="/glossary" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.menuCard,
              pressed && styles.menuCardPressed,
            ]}
          >
            <Ionicons name="book-outline" size={28} color={c.accent} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>用語集</Text>
              <Text style={styles.menuSub}>FX用語のミニ辞典</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={c.textSecondary}
            />
          </Pressable>
        </Link>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🎓</Text>
          <Text style={styles.placeholderTitle}>動画コンテンツ準備中</Text>
          <Text style={styles.placeholderText}>
            初心者向けの基礎知識・手法解説・{'\n'}
            専門家の動画を順次追加予定です。
          </Text>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </View>
      </View>
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
    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    body: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 12,
    },
    menuCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuCardPressed: {
      opacity: 0.7,
    },
    menuText: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    menuSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    placeholder: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
    },
    placeholderIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    placeholderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 12,
    },
    placeholderText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    comingSoon: {
      fontSize: 12,
      color: c.accent,
      marginTop: 20,
      fontWeight: '600',
      letterSpacing: 1,
    },
  });
}
