import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { TIER_COLORS } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';
import { planLabel, type Plan } from '@/lib/premium';

const TIER_COLOR = TIER_COLORS;

/**
 * 有料機能であることを示す小さなティアタグ。タップで課金画面へ遷移する。
 * テスト解放中（課金していないのに開けている状態）は「解放中」を併記して、
 * 本来は有料機能であることが画面上で分かるようにする。
 *
 * @param tier 必要ティア (plus / pro)。既定は plus。
 */
export function PremiumTag({
  tier = 'plus',
  compact = false,
}: {
  tier?: Extract<Plan, 'plus' | 'pro'>;
  compact?: boolean;
}) {
  const c = useThemeColors();
  const router = useRouter();
  const { t } = useI18n();
  const { testUnlock } = usePremium();
  const color = TIER_COLOR[tier];

  return (
    <Pressable
      onPress={() => router.push('/premium')}
      hitSlop={6}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: `${color}1A`, borderColor: `${color}40` },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name="sparkles" size={10} color={color} />
      <Text style={[styles.text, { color }]}>{planLabel(tier)}</Text>
      {testUnlock && !compact ? (
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          {t('premium.unlockedTag')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sub: { fontSize: 9, fontWeight: '600' },
});
