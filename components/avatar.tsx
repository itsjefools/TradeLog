import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

type AvatarProps = {
  uri: string | null | undefined;
  displayName: string;
  size?: number;
};

export function Avatar({ uri, displayName, size = 40 }: AvatarProps) {
  const c = useThemeColors();
  const initial = (displayName.charAt(0) || '?').toUpperCase();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        image: {
          width: size,
          height: size,
        },
        text: {
          fontSize: size * 0.4,
          fontWeight: '700',
          color: '#fff',
        },
      }),
    [size, c.accent],
  );

  return (
    <View style={styles.wrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={styles.text}>{initial}</Text>
      )}
    </View>
  );
}
