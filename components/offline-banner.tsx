import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/hooks/use-i18n';
import { useNetwork } from '@/hooks/use-network';

/**
 * オフライン時にだけ画面上部に赤いバーをスライドインさせる。
 * オンライン復帰時にスライドアウトしてからアンマウントする。
 */
export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -80,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  // 完全に非表示の状態では DOM からも外して触れないようにする
  if (!isOffline) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 6, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>{t('network.offline')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
