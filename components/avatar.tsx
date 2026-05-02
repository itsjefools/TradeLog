import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPreview, AvatarPreviewProfile } from '@/components/avatar-preview';
import { PremiumBadge } from '@/components/premium-badge';
import { useThemeColors } from '@/hooks/use-theme';

type AvatarProps = {
  uri: string | null | undefined;
  displayName: string;
  size?: number;
  /** プロフィール情報。渡すと長押しでプレビュー表示 */
  profile?: AvatarPreviewProfile | null;
  /** タップ時のハンドラ。長押しプレビューと併用可能 */
  onPress?: () => void;
  /** Premium バッジを表示するか。サイズ 32 未満では自動的に非表示 */
  showPremiumBadge?: boolean;
};

export function Avatar({
  uri,
  displayName,
  size = 40,
  profile,
  onPress,
  showPremiumBadge = true,
}: AvatarProps) {
  const c = useThemeColors();
  const [previewVisible, setPreviewVisible] = useState(false);
  const initial = (displayName.charAt(0) || '?').toUpperCase();

  const showBadge =
    showPremiumBadge && profile?.is_premium === true && size >= 32;
  const badgeSize = Math.max(12, Math.round(size * 0.32));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          width: size,
          height: size,
          position: 'relative',
        },
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
        badge: {
          position: 'absolute',
          right: -2,
          bottom: -2,
        },
      }),
    [size, c.accent],
  );

  const inner = (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={styles.text}>{initial}</Text>
        )}
      </View>
      {showBadge && (
        <View style={styles.badge}>
          <PremiumBadge size={badgeSize} />
        </View>
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
