import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>フィード</Text>
        <Text style={styles.subtitle}>フォロー中のトレーダーの投稿</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>まだ投稿がありません</Text>
          <Text style={styles.placeholderText}>
            気になるトレーダーをフォローして、{'\n'}
            タイムラインを賑やかにしましょう。
          </Text>
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
    paddingTop: 24,
  },
  placeholder: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  _accent: {
    color: ACCENT,
  },
});
