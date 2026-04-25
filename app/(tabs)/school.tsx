import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🎓</Text>
          <Text style={styles.placeholderTitle}>準備中</Text>
          <Text style={styles.placeholderText}>
            初心者向けの基礎知識・{'\n'}
            手法解説・専門家の動画など、{'\n'}
            学習コンテンツを順次追加予定です。
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
      paddingTop: 32,
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
