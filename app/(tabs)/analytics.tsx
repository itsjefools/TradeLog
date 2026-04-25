import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>あなたのトレード成績</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>月間P&L</Text>
            <Text style={styles.kpiValue}>¥0</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>勝率</Text>
            <Text style={styles.kpiValue}>—</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>RR比</Text>
            <Text style={styles.kpiValue}>—</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>取引回数</Text>
            <Text style={styles.kpiValue}>0</Text>
          </View>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>チャートエリア</Text>
          <Text style={styles.placeholderText}>
            取引を記録すると、{'\n'}
            P&L推移・通貨ペア別成績が表示されます。
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
    paddingTop: 20,
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  placeholder: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
});
