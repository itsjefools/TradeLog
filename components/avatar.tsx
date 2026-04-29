import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPreview, AvatarPreviewProfile } from '@/components/avatar-preview';
import { useThemeColors } from '@/hooks/use-theme';

type AvatarProps = {
  uri: string | null | undefined;
  displayName: string;
  size?: number;
  /** プロフィール情報。渡すと長押しでプレビュー表示 */
  profile?: AvatarPreviewProfile | null;
  /** タップ時のハンドラ。長押しプレビューと併用可能 */
  onPress?: () => void;
};

export function Avatar({
  uri,
  displayName,
  size = 40,
  profile,
  onPress,
}: AvatarProps) {
  const c = useThemeColors();
  const [previewVisible, setPreviewVisible] = useState(false);
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

  const inner = (
    <View style={styles.wrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={styles.text}>{initial}</Text>
      )}
    </View>
  );

  const interactive = profile !== undefined && profile !== null;

  if (!interactive && !onPress) {
    return inner;
  }

  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={interactive ? () => setPreviewVisible(true) : undefined}
        onPressOut={
          interactive ? () => setPreviewVisible(false) : undefined
        }
        delayLongPress={500}
      >
        {inner}
      </Pressable>
      {interactive && (
        <AvatarPreview
          visible={previewVisible}
          uri={uri}
          displayName={displayName}
          profile={profile}
        />
      )}
    </>
  );
}
