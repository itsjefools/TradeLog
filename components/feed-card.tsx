import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image as RNImage,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
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
import { ImageViewer } from '@/components/image-viewer';
import { ReportModal } from '@/components/report-modal';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { formatPnlWithCurrency } from '@/lib/format-currency';
import { findCountry, flagEmoji } from '@/lib/countries';
import { formatRelativeTime } from '@/lib/format-time';
import { tapSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { isVideoUrl } from '@/lib/upload-media';
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
  onDeleted,
}: {
  item: FeedCardItem;
  onToggleLike: (item: FeedCardItem) => void;
  onToggleBookmark: (item: FeedCardItem) => void;
  onToggleRepost: (item: FeedCardItem) => void;
  onDeleted?: (postId: string) => void;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const { profile: myProfile } = useProfile();
  const currency = myProfile?.currency;
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const [reportVisible, setReportVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const myUserId = session?.user.id ?? null;
  const isMyPost = !!myUserId && item.user_id === myUserId;

  const handleEdit = () => {
    if (item.trade_id) {
      router.push(`/trade-edit?id=${item.trade_id}`);
    } else {
      Alert.alert(t('feed.cantEditTitle'), t('feed.cantEditBody'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('feed.confirmDeletePostTitle'),
      t('feed.confirmDeletePostBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('posts')
              .delete()
              .eq('id', item.id);
            if (error) {
              Alert.alert(t('feed.deleteFailTitle'), error.message);
              return;
            }
            onDeleted?.(item.id);
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    const trade = item.trade;
    const tradeLine =
      trade && trade.pnl !== null
        ? `${trade.currency_pair} ${trade.direction === 'long' ? t('common.long') : t('common.short')} ${trade.pnl > 0 ? '+' : ''}${Math.round(trade.pnl).toLocaleString()}`
        : '';
    const message = [item.content ?? '', tradeLine, t('feed.shareSignature')]
      .filter((s) => s.trim() !== '')
      .join('\n\n');
    try {
      await Share.share({ message });
    } catch {
      // ユーザーキャンセル等は無視
    }
  };

  const handleMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);
  const profile = item.profile;
  const trade = item.trade;
  const fallbackName = profile?.email?.split('@')[0] ?? t('profile.defaultName');
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
      ? t('common.long')
      : t('common.short')
    : '';
  const resultLabel = trade
    ? trade.result === 'win'
      ? t('common.win')
      : trade.result === 'loss'
        ? t('common.loss')
        : null
    : null;
  const dateStr = formatRelativeTime(trade?.traded_at ?? item.created_at);

  const userId = profile?.id ?? item.user_id;

  const repostByName =
    item.reposted_by?.display_name?.trim() ||
    item.reposted_by?.username?.trim() ||
    null;
  const likedByName =
    item.liked_by?.display_name?.trim() ||
    item.liked_by?.username?.trim() ||
    null;

  const renderMenu = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        onPress={() => setMenuVisible(false)}
      >
        <Pressable
          style={{
            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            paddingBottom: 34,
            paddingTop: 8,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: isDark ? '#48484A' : '#D1D1D6',
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />
          {isMyPost ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  setMenuVisible(false);
                  handleEdit();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={{
                    marginLeft: 16,
                    fontSize: 17,
                    color: isDark ? '#FFFFFF' : '#000000',
                  }}
                >
                  {t('feed.menuEdit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuVisible(false);
                  handleDelete();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                <Text
                  style={{
                    marginLeft: 16,
                    fontSize: 17,
                    color: '#FF3B30',
                  }}
                >
                  {t('feed.menuDelete')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                setReportVisible(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Ionicons name="flag-outline" size={22} color="#FF3B30" />
              <Text style={{ marginLeft: 16, fontSize: 17, color: '#FF3B30' }}>
                {t('feed.menuReport')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setMenuVisible(false)}
            style={{
              alignItems: 'center',
              paddingVertical: 16,
              marginTop: 8,
              marginHorizontal: 16,
              borderRadius: 10,
              backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: isDark ? '#FFFFFF' : '#007AFF',
              }}
            >
              {t('feed.menuCancel')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const mediaUrls = useMemo(() => {
    const imgs = item.image_urls ?? [];
    const vids = item.video_urls ?? [];
    return [...imgs, ...vids];
  }, [item.image_urls, item.video_urls]);

  // 取引結果のみ(本文・画像なし)はTradingView風コンパクト1行レイアウト
  const isCompactTradeOnly =
    item.post_type === 'trade_result' &&
    !!trade &&
    (!item.content || item.content.trim() === '') &&
    mediaUrls.length === 0;

  if (isCompactTradeOnly && trade) {
    const dirShort = trade.direction === 'long' ? 'L' : 'S';
    const dirColor = trade.direction === 'long' ? c.win : c.loss;
    const priceFlow =
      trade.entry_price != null && trade.exit_price != null
        ? `${trade.entry_price} → ${trade.exit_price}`
        : '—';
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactRow1}>
          <Text style={styles.compactTime}>{dateStr}</Text>
          <Text style={styles.compactPair}>{trade.currency_pair}</Text>
          <Text style={[styles.compactDir, { color: dirColor }]}>{dirShort}</Text>
          <Text style={styles.compactPriceFlow}>{priceFlow}</Text>
          <TouchableOpacity
            onPress={handleMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 6 }}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={c.textPrimary}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.compactRow2}>
          <Text style={[styles.compactPnl, pnlColor(trade.pnl, c)]}>
            {trade.pnl !== null ? formatPnlWithCurrency(trade.pnl, currency) : '—'}
          </Text>
          {trade.pnl_pips !== null && (
            <Text style={[styles.compactPips, pnlColor(trade.pnl_pips, c)]}>
              {formatPips(trade.pnl_pips)}
            </Text>
          )}
        </View>
        <View style={styles.compactRow3}>
          <Pressable onPress={() => router.push(`/user/${userId}`)} hitSlop={6}>
            <Text style={styles.compactUser}>@{username}</Text>
          </Pressable>
          <View style={styles.compactActions}>
            <Pressable
              onPress={() => onToggleLike(item)}
              hitSlop={8}
              style={styles.compactActionItem}
            >
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={14}
                color={item.is_liked ? c.loss : c.textSecondary}
              />
              <Text style={styles.compactActionCount}>{item.likes_count}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/comments?postId=${item.id}`)}
              hitSlop={8}
              style={styles.compactActionItem}
            >
              <Ionicons
                name="chatbubble-outline"
                size={13}
                color={c.textSecondary}
              />
              <Text style={styles.compactActionCount}>{item.comments_count}</Text>
            </Pressable>
          </View>
        </View>
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType="post"
          targetId={item.id}
        />
        {renderMenu()}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {repostByName && (
        <View style={styles.likedByRow}>
          <Ionicons name="repeat" size={12} color={c.win} />
          <Text style={styles.likedByText}>
            {repostByName}{t('feed.repostedBy')}
          </Text>
        </View>
      )}
      {!repostByName && likedByName && (
        <View style={styles.likedByRow}>
          <Ionicons name="heart" size={12} color={c.loss} />
          <Text style={styles.likedByText}>
            {likedByName}{t('feed.likedBy')}
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
        <TouchableOpacity
          onPress={handleMenu}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 8 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={c.textPrimary}
          />
        </TouchableOpacity>
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
              {trade.pnl !== null ? formatPnlWithCurrency(trade.pnl, currency) : '—'}
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

      {mediaUrls.length > 0 && (
        <MediaCarousel
          urls={mediaUrls}
          onTapImage={(uri) => {
            const photoOnly = mediaUrls.filter((u) => !isVideoUrl(u));
            const i = photoOnly.indexOf(uri);
            if (i >= 0) setViewerIndex(i);
          }}
        />
      )}

      {mediaUrls.length > 0 && (
        <ImageViewer
          visible={viewerIndex !== null}
          uris={mediaUrls.filter((u) => !isVideoUrl(u))}
          initialIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />
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
          onPress={() => {
            tapSuccess();
            onToggleRepost(item);
          }}
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
          onPress={() => {
            tapSuccess();
            onToggleBookmark(item);
          }}
          hitSlop={12}
        >
          <Ionicons
            name={item.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={item.is_bookmarked ? c.accent : c.textSecondary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={handleShare}
          hitSlop={12}
        >
          <Ionicons
            name="share-outline"
            size={20}
            color={c.textSecondary}
          />
        </Pressable>

        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {renderMenu()}
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 14;
const CARD_INNER = SCREEN_WIDTH - 12 * 2 - CARD_PADDING * 2;
// 画像高さの上下限。極端に縦長/横長の画像を防ぐ
const MEDIA_MIN_HEIGHT = 220;
const MEDIA_MAX_HEIGHT = Math.round(SCREEN_WIDTH * 1.25); // 4:5 縦長まで

/**
 * FX チャート向けカルーセル:
 * 最初の画像の本来のアスペクト比に高さを合わせて、画像が縮小されない。
 * 1 枚ずつ横スワイプ + ドット表示。タップでフルスクリーン viewer を開く。
 */
function MediaCarousel({
  urls,
  onTapImage,
}: {
  urls: string[];
  onTapImage: (uri: string) => void;
}) {
  const c = useThemeColors();
  const [index, setIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // 最初の画像の自然なアスペクト比を取得（動画ならスキップしてデフォルト 16:9）
  useEffect(() => {
    const first = urls[0];
    if (!first) return;
    if (isVideoUrl(first)) {
      setAspectRatio(16 / 9);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      first,
      (w, h) => {
        if (cancelled) return;
        setAspectRatio(w > 0 && h > 0 ? w / h : 16 / 9);
      },
      () => {
        if (!cancelled) setAspectRatio(16 / 9);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [urls]);

  // CARD_INNER / aspect = 推奨高さ。MIN/MAX でクランプ
  const naturalHeight =
    aspectRatio && aspectRatio > 0 ? CARD_INNER / aspectRatio : CARD_INNER;
  const mediaHeight = Math.max(
    MEDIA_MIN_HEIGHT,
    Math.min(MEDIA_MAX_HEIGHT, naturalHeight),
  );

  const styles = useMemo(
    () => makeMediaStyles(c, mediaHeight),
    [c, mediaHeight],
  );

  const onScroll = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / CARD_INNER);
    if (next !== index) setIndex(next);
  };

  // アスペクト計算前は黙ってスケルトン的なスペースを確保（幅は維持）
  if (aspectRatio === null) {
    return <View style={styles.wrap} />;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={urls.length > 1}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {urls.map((uri) => (
          <MediaTile
            key={uri}
            uri={uri}
            height={mediaHeight}
            onTapImage={onTapImage}
          />
        ))}
      </ScrollView>

      {urls.length > 1 && (
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>
            {index + 1}/{urls.length}
          </Text>
        </View>
      )}

      {urls.length > 1 && (
        <View style={styles.dots}>
          {urls.map((u, i) => (
            <View
              key={u}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function MediaTile({
  uri,
  height,
  onTapImage,
}: {
  uri: string;
  height: number;
  onTapImage: (uri: string) => void;
}) {
  const c = useThemeColors();
  const tileStyle = {
    width: CARD_INNER,
    height,
    backgroundColor: c.surfaceAlt,
  };
  const isVideo = isVideoUrl(uri);
  if (isVideo) {
    return <FeedVideoPlayer uri={uri} width={CARD_INNER} height={height} />;
  }
  return (
    <Pressable
      onPress={() => onTapImage(uri)}
      style={tileStyle}
      unstable_pressDelay={0}
      delayLongPress={800}
      pressRetentionOffset={40}
      hitSlop={4}
    >
      <Image
        source={{ uri }}
        style={tileStyle}
        contentFit="contain"
      />
    </Pressable>
  );
}

function FeedVideoPlayer({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  return (
    <View
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#000',
      }}
    >
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        nativeControls={false}
      />

      <Pressable
        onPress={togglePlay}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {!isPlaying && (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(0,0,0,0.55)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="play"
              size={26}
              color="#fff"
              style={{ marginLeft: 3 }}
            />
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={toggleMute}
        hitSlop={6}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}

function makeMediaStyles(c: ThemeColors, height: number) {
  return StyleSheet.create({
    wrap: {
      marginTop: 10,
      width: CARD_INNER,
      height,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.surfaceAlt,
      position: 'relative',
    },
    counterPill: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    counterText: {
      fontSize: 11,
      color: '#fff',
      fontWeight: '700',
    },
    dots: {
      position: 'absolute',
      bottom: 8,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
      backgroundColor: '#fff',
      width: 8,
      height: 8,
      borderRadius: 8,
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
    tapSuccess();
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

// 通貨対応の P&L 表示は formatPnlWithCurrency(n, currency) を使う

function formatPips(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} pips`;
}

function pnlColor(n: number | null, c: ThemeColors): TextStyle | undefined {
  if (n === null || n === 0) return undefined;
  return { color: n > 0 ? c.win : c.loss };
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    compactCard: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 2,
    },
    compactRow1: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    compactTime: {
      fontSize: 11,
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
      width: 40,
    },
    compactPair: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: 0.3,
    },
    compactDir: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      width: 14,
    },
    compactPriceFlow: {
      fontSize: 12,
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
      flex: 1,
    },
    compactRow2: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      marginLeft: 48,
    },
    compactPnl: {
      fontSize: 22,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    compactPips: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    compactRow3: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginLeft: 48,
      marginTop: 2,
    },
    compactUser: {
      fontSize: 12,
      color: c.textSecondary,
    },
    compactActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    compactActionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    compactActionCount: {
      fontSize: 11,
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
      minWidth: 12,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
      gap: 6,
      marginTop: 6,
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
      borderRadius: 10,
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
      fontVariant: ['tabular-nums'],
    },
    tradePips: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
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
      fontVariant: ['tabular-nums'],
    },
    date: {
      fontSize: 11,
      color: c.textSecondary,
      marginLeft: 'auto',
    },
  });
}
