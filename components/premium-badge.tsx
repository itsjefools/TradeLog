import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

const ACCENT = '#10B981';

/**
 * Premium ユーザーを示す小さなダイヤモンドバッジ。
 * Avatar の右下にオーバーレイすることを想定。
 */
export function PremiumBadge({ size = 14 }: { size?: number }) {
  const inner = size - 4;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Ionicons name="diamond" size={inner * 0.7} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
