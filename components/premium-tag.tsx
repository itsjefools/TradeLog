import { StyleSheet, Text, View } from 'react-native';

import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';

const ACCENT = '#10B981';

/**
 * プレミアム機能であることを示す小さな「PRO」タグ。
 * テスト解放中（課金していないのに開けている状態）は「PRO 解放中」と出して、
 * 本来は有料機能であることが画面上で分かるようにする。
 */
export function PremiumTag({ compact = false }: { compact?: boolean }) {
  const c = useThemeColors();
  const { testUnlock } = usePremium();

  return (
    <View style={[styles.wrap, { backgroundColor: `${ACCENT}1A` }]}>
      <Text style={[styles.text, { color: ACCENT }]}>PRO</Text>
      {testUnlock && !compact ? (
        <Text style={[styles.sub, { color: c.textSecondary }]}>解放中</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sub: { fontSize: 9, fontWeight: '600' },
});
