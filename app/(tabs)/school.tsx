import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SchoolScreen() {
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

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const SURFACE = '#1E293B';
const BORDER = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_SECONDARY = '#94A3B8';

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
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  placeholder: {
    backgroundColor: SURFACE,
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
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  comingSoon: {
    fontSize: 12,
    color: ACCENT,
    marginTop: 20,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
