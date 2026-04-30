import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { ReportModal } from '@/components/report-modal';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';
import { isVideoUrl } from '@/lib/upload-media';
import { findCountry, flagEmoji } from '@/lib/countries';
import { Post, Profile, Trade, tradeStyleLabel } from '@/lib/types';

export type FeedCardItem = Post & {
  trade: Trade | null;
  profile: Profile | null;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_reposted: boolean;
  liked_by?: Profile | null;
  reposted_by?: Profile | null;
};

export function FeedCard({
  item,
  onToggleLike,
  onToggleBookmark,
  onToggleRepost,
}: {
  item: FeedCardItem;
  onToggleLike: (item: FeedCardItem) => void;
  onToggleBookmark: (item: FeedCardItem) => void;
  onToggleRepost: (item: FeedCardItem) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [reportVisible, setReportVisible] = useState(false);

  const handleMenu = () => {
    Alert.alert('オプション', undefined, [
      {
        text: '通報',
        style: 'destructive',
        onPress: () => setReportVisible(true),
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };
  const profile = item.profile;
  const trade = item.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;
  const username = profile?.username?.trim() || fallbackName;
  const flag = profile?.nationality ? flagEmoji(profile.nationality) : '';
  const country = findCountry(profile?.nationality ?? null);
  const styleText = profile?.trade_style
    ? tradeStyleLabel(profile.trade_style)
    : '';

  const directionLabel = trade
    ? trade.direction === 'long'
      ? 'ロング'
      : 'ショート'
    : '';
  const resultLabel = trade
    ? trade.result === 'win'
      ? '利確'
      : trade.result === 'loss'
        ? '損切り'
        : null
    : null;
  const date = new Date(trade?.traded_at ?? item.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const userId = profile?.id ?? item.user_id;

  const repostByName =
    item.reposted_by?.display_name?.trim() ||
    item.reposted_by?.username?.trim() ||
    null;
  const likedByName =
    item.liked_by?.display_name?.trim() ||
    item.liked_by?.username?.trim() ||
    null;

  return (
    <View style={styles.card}>
      {repostByName && (
        <View style={styles.likedByRow}>
          <Ionicons name="repeat" size={12} color={c.win} />
          <Text style={styles.likedByText}>
            {repostByName} さんがリポストしました
          </Text>
        </View>
      )}
      {!repostByName && likedByName && (
        <View style={styles.likedByRow}>
          <Ionicons name="heart" size={12} color={c.loss} />
          <Text style={styles.likedByText}>
            {likedByName} さんがいいねしました
          </Text>
        </View>
      )}

      <View style={styles.userRowOuter}>
        <Pressable
          style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
          onPress={() => router.push(`/user/${userId}`)}
        >
          <Avatar
            uri={profile?.avatar_url}
            displayName={displayName}
            size={40}
            profile={profile}
            onPress={() => router.push(`/user/${userId}`)}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.username}>@{username}</Text>
              {flag !== '' && (
                <>
                  <Text style={styles.metaSep}>·</Text>
                  <Text style={styles.flag}>{flag}</Text>
                  {country && (
                    <Text style={styles.metaText}>{country.name}</Text>
                  )}
                </>
              )}
              {styleText && (
                <>
                  <Text style={styles.metaSep}>·</Text>
                  <Text style={styles.metaText}>{styleText}</Text>
                </>
              )}
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={handleMenu}
          style={({ pressed }) => [
            styles.moreButton,
            pressed && styles.moreButtonPressed,
          ]}
          hitSlop={12}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={c.textSecondary}
          />
        </Pressable>
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="post"
        targetId={item.id}
      />

      {trade && (
        <View style={styles.tradeBlock}>
          <View style={styles.tradeHead}>
            <Text style={styles.tradePair}>{trade.currency_pair}</Text>
            <Text style={styles.tradeDirection}>{directionLabel}</Text>
            {resultLabel && (
              <View
                style={[
                  styles.resultBadge,
                  trade.result === 'win'
                    ? styles.resultBadgeWin
                    : styles.resultBadgeLoss,
                ]}
              >
                <Text style={styles.resultBadgeText}>{resultLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.tradeNumbers}>
            <Text style={[styles.tradePnl, pnlColor(trade.pnl, c)]}>
              {trade.pnl !== null ? formatPnl(trade.pnl) : '—'}
            </Text>
            {trade.pnl_pips !== null && (
              <Text style={[styles.tradePips, pnlColor(trade.pnl_pips, c)]}>
                {formatPips(trade.pnl_pips)}
              </Text>
            )}
          </View>
        </View>
      )}

      {item.content && item.content.trim() !== '' && (
        <Text style={styles.memo}>{item.content}</Text>
      )}

      {item.image_urls && item.image_urls.length > 0 && (
        <MediaGrid urls={item.image_urls} />
      )}

      {item.hashtags && item.hashtags.length > 0 && (
        <View style={styles.tagChips}>
          {item.hashtags.slice(0, 6).map((tag) => (
            <Pressable
              key={tag}
              onPress={() => router.push(`/search?tag=${tag}`)}
              style={styles.tagChip}
              hitSlop={4}
            >
              <Text style={styles.tagChipText}>#{tag}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <LikeButton
          liked={item.is_liked}
          count={item.likes_count}
          onPress={() => onToggleLike(item)}
        />

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => router.push(`/comments?postId=${item.id}`)}
          hitSlop={12}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={c.textSecondary}
          />
          <Text style={styles.actionCount}>{item.comments_count}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onToggleRepost(item)}
          hitSlop={12}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={item.is_reposted ? c.win : c.textSecondary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onToggleBookmark(item)}
          hitSlop={12}
        >
          <Ionicons
            name={item.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={item.is_bookmarked ? c.accent : c.textSecondary}
          />
        </Pressable>

        <Text style={styles.date}>{dateStr}</Text>
      </View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 14;
const CARD_INNER = SCREEN_WIDTH - 12 * 2 - CARD_PADDING * 2;
const GAP = 2;

function MediaGrid({ urls }: { urls: string[] }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeMediaStyles(c), [c]);
  const list = urls.slice(0, 4);
  const count = list.length;

  if (count === 1) {
    return (
      <View style={[styles.wrap, { marginTop: 10 }]}>
        <MediaTile
          uri={list[0]}
          style={[styles.tile, { width: CARD_INNER, aspectRatio: 16 / 10 }]}
        />
      </View>
    );
  }
  if (count === 2) {
    const w = (CARD_INNER - GAP) / 2;
    return (
      <View style={[styles.row, { marginTop: 10 }]}>
        <MediaTile uri={list[0]} style={[styles.tile, { width: w, height: w }]} />
        <MediaTile uri={list[1]} style={[styles.tile, { width: w, height: w }]} />
      </View>
    );
  }
  if (count === 3) {
    const w = (CARD_INNER - GAP) / 2;
    return (
      <View style={[styles.col, { marginTop: 10 }]}>
        <MediaTile
          uri={list[0]}
          style={[styles.tile, { width: CARD_INNER, height: 200 }]}
        />
        <View style={styles.row}>
          <MediaTile uri={list[1]} style={[styles.tile, { width: w, height: w }]} />
          <MediaTile uri={list[2]} style={[styles.tile, { width: w, height: w }]} />
        </View>
      </View>
    );
  }
  // 4枚
  const w = (CARD_INNER - GAP) / 2;
  return (
    <View style={[styles.col, { marginTop: 10 }]}>
      <View style={styles.row}>
        <MediaTile uri={list[0]} style={[styles.tile, { width: w, height: w }]} />
        <MediaTile uri={list[1]} style={[styles.tile, { width: w, height: w }]} />
      </View>
      <View style={styles.row}>
        <MediaTile uri={list[2]} style={[styles.tile, { width: w, height: w }]} />
        <MediaTile uri={list[3]} style={[styles.tile, { width: w, height: w }]} />
      </View>
    </View>
  );
}

function MediaTile({
  uri,
  style,
}: {
  uri: string;
  style: object | object[];
}) {
  const isVideo = isVideoUrl(uri);
  if (isVideo) {
    return (
      <Video
        source={{ uri }}
        style={style as object}
        useNativeControls
        resizeMode={ResizeMode.COVER}
        isLooping={false}
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style as object}
      contentFit="cover"
    />
  );
}

function makeMediaStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      gap: GAP,
    },
    col: {
      flexDirection: 'column',
      gap: GAP,
    },
    tile: {
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
    },
  });
}

function LikeButton({
  liked,
  count,
  onPress,
}: {
  liked: boolean;
  count: number;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const scale = useSharedValue(1);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 110 }),
      withSpring(1, { damping: 6, stiffness: 180 }),
    );
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
      onPress={handlePress}
      hitSlop={12}
    >
      <Animated.View style={iconAnim}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={20}
          color={liked ? c.loss : c.textSecondary}
        />
      </Animated.View>
      <Text style={styles.actionCount}>{count}</Text>
    </Pressable>
  );
}

function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n).toLocaleString('ja-JP')}円`;
}

function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} pips`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
    },
    likedByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    likedByText: {
      fontSize: 11,
      color: c.textSecondary,
    },
    userRowOuter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    userRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    userRowPressed: {
      opacity: 0.7,
    },
    moreButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    moreButtonPressed: {
      opacity: 0.5,
    },
    userInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    displayName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    verifiedBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.verified,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    username: {
      fontSize: 12,
      color: c.textSecondary,
    },
    metaSep: {
      fontSize: 12,
      color: c.textSecondary,
    },
    flag: {
      fontSize: 13,
    },
    metaText: {
      fontSize: 12,
      color: c.textSecondary,
    },
    tradeBlock: {
      backgroundColor: c.background,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    tradeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tradePair: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    tradeDirection: {
      fontSize: 13,
      color: c.textSecondary,
    },
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    resultBadgeWin: {
      backgroundColor: c.win,
    },
    resultBadgeLoss: {
      backgroundColor: c.loss,
    },
    resultBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    tradeNumbers: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
    },
    tradePnl: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    tradePips: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
    },
    memo: {
      fontSize: 13,
      color: c.textPrimary,
      marginTop: 10,
      lineHeight: 19,
    },
    tagChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
    },
    tagChipText: {
      fontSize: 11,
      color: c.accent,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionButtonPressed: {
      opacity: 0.6,
    },
    actionCount: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
      minWidth: 18,
    },
    date: {
      fontSize: 11,
      color: c.textSecondary,
      marginLeft: 'auto',
    },
  });
}
