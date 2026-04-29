import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';
import { findCountry, flagEmoji } from '@/lib/countries';
import { tradeStyleLabel } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_SIZE = Math.round(SCREEN_WIDTH * 0.75);

export type AvatarPreviewProfile = {
  username?: string | null;
  is_verified?: boolean | null;
  nationality?: string | null;
  trade_style?: string | null;
};

export function AvatarPreview({
  visible,
  uri,
  displayName,
  profile,
}: {
  visible: boolean;
  uri: string | null | undefined;
  displayName: string;
  profile: AvatarPreviewProfile | null | undefined;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const username = profile?.username?.trim() || null;
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile?.nationality ?? null);
  const styleText = profile?.trade_style ? tradeStyleLabel(profile.trade_style) : '';

  const initial = (displayName.charAt(0) || '?').toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      {visible && (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          style={styles.backdrop}
        >
          <Animated.View
            entering={ZoomIn.duration(180)}
            exiting={ZoomOut.duration(140)}
            style={styles.content}
          >
            <View style={styles.imageWrap}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.initial}>{initial}</Text>
              )}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>

            {username && (
              <Text style={styles.username}>@{username}</Text>
            )}

            <View style={styles.metaRow}>
              {flag !== '' && (
                <View style={styles.metaItem}>
                  <Text style={styles.flag}>{flag}</Text>
                  <Text style={styles.metaText}>
                    {country?.name ?? profile?.nationality ?? ''}
                  </Text>
                </View>
              )}
              {styleText && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={14}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text style={styles.metaText}>{styleText}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 24,
    },
    imageWrap: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      borderRadius: PREVIEW_SIZE / 2,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 14,
    },
    image: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
    },
    initial: {
      fontSize: PREVIEW_SIZE * 0.4,
      fontWeight: '700',
      color: '#fff',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
    },
    verifiedBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    username: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.7)',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 14,
      marginTop: 6,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    flag: {
      fontSize: 18,
    },
    metaText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
    },
  });
}
