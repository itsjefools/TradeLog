import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 50) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.8;

type Wallpaper = {
  id: string;
  user_id: string;
  image_url: string;
  rules_text: string | null;
  like_count: number;
  download_count: number;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

export function WallpaperGallery() {
  const c = useThemeColors();
  const { t } = useI18n();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [wpRes, likeRes] = await Promise.all([
        supabase
          .from('user_wallpapers')
          .select('*, profiles:user_id(username, avatar_url)')
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(50),
        userId
          ? supabase
              .from('wallpaper_likes')
              .select('wallpaper_id')
              .eq('user_id', userId)
          : Promise.resolve({ data: [] as { wallpaper_id: string }[] }),
      ]);
      if (cancelled) return;
      setWallpapers((wpRes.data ?? []) as Wallpaper[]);
      setLikedIds(new Set((likeRes.data ?? []).map((r) => r.wallpaper_id as string)));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleLike = async (wallpaperId: string) => {
    if (!userId) return;
    const isLiked = likedIds.has(wallpaperId);
    if (isLiked) {
      await supabase
        .from('wallpaper_likes')
        .delete()
        .eq('wallpaper_id', wallpaperId)
        .eq('user_id', userId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(wallpaperId);
        return next;
      });
    } else {
      await supabase
        .from('wallpaper_likes')
        .insert({ wallpaper_id: wallpaperId, user_id: userId });
      setLikedIds((prev) => new Set(prev).add(wallpaperId));
    }
    setWallpapers((prev) =>
      prev.map((w) =>
        w.id === wallpaperId
          ? { ...w, like_count: Math.max(0, w.like_count + (isLiked ? -1 : 1)) }
          : w,
      ),
    );
  };

  const handleDownload = async (imageUrl: string, wallpaperId: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', t('wallpaper.permission_required'));
        return;
      }
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const fileUri = `${cacheDir}wallpaper_${Date.now()}.png`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      await supabase.rpc('increment_wallpaper_downloads', { wp_id: wallpaperId });
      setWallpapers((prev) =>
        prev.map((w) =>
          w.id === wallpaperId
            ? { ...w, download_count: w.download_count + 1 }
            : w,
        ),
      );
      Alert.alert(t('wallpaper.saved_title'), t('wallpaper.saved_private'));
    } catch {
      Alert.alert(t('wallpaper.error'), t('wallpaper.save_failed'));
    }
  };

  return (
    <FlatList
      data={wallpapers}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      bounces={false}
      renderItem={({ item }) => {
        const isLiked = likedIds.has(item.id);
        return (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => handleDownload(item.image_url, item.id)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.cardImage}
                contentFit="cover"
              />
            </TouchableOpacity>

            <View style={styles.metaRow}>
              <TouchableOpacity
                onPress={() => handleLike(item.id)}
                hitSlop={6}
                style={styles.metaAction}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isLiked ? c.loss : c.textSecondary}
                />
                <Text style={styles.metaText}>{item.like_count}</Text>
              </TouchableOpacity>
              <View style={styles.metaAction}>
                <Ionicons
                  name="download-outline"
                  size={14}
                  color={c.textSecondary}
                />
                <Text style={styles.metaText}>{item.download_count}</Text>
              </View>
              <View style={styles.flexSpacer} />
              {item.profiles?.username ? (
                <Text style={styles.metaUsername} numberOfLines={1}>
                  @{item.profiles.username}
                </Text>
              ) : null}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="image-outline"
          title={t('empty.wallpaper_title')}
          subtitle={t('empty.wallpaper_subtitle')}
        />
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    listContent: { padding: 15, paddingBottom: 40 },
    columnWrapper: { gap: 10 },
    card: { marginBottom: 14, width: CARD_WIDTH },
    cardImage: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 2,
    },
    metaAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginRight: 14,
    },
    metaText: {
      fontSize: 12,
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    flexSpacer: { flex: 1 },
    metaUsername: {
      fontSize: 11,
      color: c.textSecondary,
      maxWidth: 80,
    },
  });
}
