import { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';

export function SkeletonBlock({
  style,
}: {
  style?: ViewStyle | ViewStyle[];
}) {
  const c = useThemeColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { backgroundColor: c.surfaceAlt, borderRadius: 4 },
        style,
        animStyle,
      ]}
    />
  );
}

export function FeedCardSkeleton() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock style={styles.avatar} />
        <View style={styles.col}>
          <SkeletonBlock style={styles.lineShort} />
          <SkeletonBlock style={styles.lineXshort} />
        </View>
      </View>
      <SkeletonBlock style={styles.tradeBlock} />
      <SkeletonBlock style={styles.line} />
      <SkeletonBlock style={styles.lineShort} />
    </View>
  );
}

export function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 6,
      padding: 14,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    col: {
      flex: 1,
      gap: 6,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    lineXshort: { height: 10, width: '30%' },
    lineShort: { height: 12, width: '55%' },
    line: { height: 14, width: '90%' },
    tradeBlock: { height: 56, width: '100%', borderRadius: 4 },
  });
}
