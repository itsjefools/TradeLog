import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Video = {
  id: string;
  title_ja: string;
  title_en: string | null;
  title_pt: string | null;
  title_es: string | null;
  description_ja: string | null;
  description_en: string | null;
  description_pt: string | null;
  description_es: string | null;
  youtube_video_id: string;
  thumbnail_url: string | null;
  category: 'basics' | 'technical' | 'strategy' | 'psychology' | 'news';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_seconds: number | null;
  is_featured: boolean;
  is_free: boolean;
};

type VideoCategory = 'all' | Video['category'];

function pickLocalized(video: Video, field: 'title' | 'description', lang: Locale): string {
  const key = `${field}_${lang}` as keyof Video;
  const v = video[key];
  if (typeof v === 'string' && v.length > 0) return v;
  const en = video[`${field}_en` as keyof Video];
  if (typeof en === 'string' && en.length > 0) return en;
  const ja = video[`${field}_ja` as keyof Video];
  if (typeof ja === 'string') return ja;
  return '';
}

function formatDuration(seconds: number | null): string {
  const s = seconds ?? 0;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function getThumbnail(video: Video): string {
  return (
    video.thumbnail_url ||
    `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`
  );
}

export function SchoolVideos() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isPremium } = usePremium();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>('all');

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('school_videos')
        .select('*')
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setVideos((data ?? []) as Video[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVideos = useMemo(
    () =>
      selectedCategory === 'all'
        ? videos
        : videos.filter((v) => v.category === selectedCategory),
    [videos, selectedCategory],
  );
  const featuredVideos = useMemo(() => videos.filter((v) => v.is_featured), [videos]);

  const categories: { key: VideoCategory; label: string }[] = [
    { key: 'all', label: t('school.video_all') },
    { key: 'basics', label: t('school.video_basics') },
    { key: 'technical', label: t('school.video_technical') },
    { key: 'strategy', label: t('school.video_strategy') },
    { key: 'psychology', label: t('school.video_psychology') },
    { key: 'news', label: t('school.video_news') },
  ];

  const handleVideoPress = (video: Video) => {
    if (!video.is_free && !isPremium) {
      router.push('/school/premium');
      return;
    }
    router.push(`/school/video/${video.id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredVideos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          {selectedCategory === 'all' && featuredVideos.length > 0 && (
            <View style={styles.featuredBlock}>
              <Text style={styles.sectionLabel}>{t('school.featured_videos')}</Text>
              <FlatList
                data={featuredVideos}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                keyExtractor={(item) => `featured-${item.id}`}
                renderItem={({ item }) => {
                  const locked = !item.is_free && !isPremium;
                  return (
                    <TouchableOpacity
                      onPress={() => handleVideoPress(item)}
                      activeOpacity={0.85}
                      style={styles.featuredCard}
                    >
                      <View style={styles.featuredThumbWrap}>
                        <Image
                          source={{ uri: getThumbnail(item) }}
                          style={styles.featuredThumb}
                          contentFit="cover"
                        />
                        <View style={styles.durationPill}>
                          <Text style={styles.durationText}>
                            {formatDuration(item.duration_seconds)}
                          </Text>
                        </View>
                        {locked && (
                          <View style={styles.premiumPill}>
                            <Text style={styles.premiumPillText}>PREMIUM</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.featuredTitle} numberOfLines={2}>
                        {pickLocalized(item, 'title', lang)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(item.key)}
                  style={[
                    styles.categoryChip,
                    isActive
                      ? styles.categoryChipActive
                      : styles.categoryChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive
                        ? styles.categoryChipTextActive
                        : styles.categoryChipTextInactive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      }
      renderItem={({ item }) => {
        const locked = !item.is_free && !isPremium;
        return (
          <TouchableOpacity
            onPress={() => handleVideoPress(item)}
            activeOpacity={0.7}
            style={styles.row}
          >
            <View style={styles.rowThumbWrap}>
              <Image
                source={{ uri: getThumbnail(item) }}
                style={styles.rowThumb}
                contentFit="cover"
              />
              <View style={styles.rowDurationPill}>
                <Text style={styles.rowDurationText}>
                  {formatDuration(item.duration_seconds)}
                </Text>
              </View>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {pickLocalized(item, 'title', lang)}
              </Text>
              <View style={styles.rowMetaRow}>
                <Text style={styles.rowCategory}>
                  {t(`school.video_${item.category}`)}
                </Text>
                {locked && (
                  <View style={styles.rowPremiumBadge}>
                    <Text style={styles.rowPremiumBadgeText}>PREMIUM</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 40 },
    featuredBlock: { marginBottom: 16, paddingTop: 12 },
    sectionLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    featuredList: { paddingHorizontal: 16 },
    featuredCard: { width: 260, marginHorizontal: 4 },
    featuredThumbWrap: {
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    featuredThumb: {
      width: 260,
      height: 146,
      backgroundColor: c.surfaceAlt,
    },
    durationPill: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    durationText: {
      fontSize: 11,
      color: '#fff',
      fontVariant: ['tabular-nums'],
    },
    premiumPill: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: 'rgba(245,158,11,0.92)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    premiumPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    featuredTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
      marginTop: 8,
    },
    categoryList: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      marginHorizontal: 4,
    },
    categoryChipActive: { backgroundColor: c.accent },
    categoryChipInactive: { backgroundColor: c.surfaceAlt },
    categoryChipText: { fontSize: 13 },
    categoryChipTextActive: {
      color: c.onAccent,
      fontWeight: '700',
    },
    categoryChipTextInactive: {
      color: c.textSecondary,
      fontWeight: '500',
    },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    rowThumbWrap: {
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
    },
    rowThumb: {
      width: 140,
      height: 79,
      backgroundColor: c.surfaceAlt,
    },
    rowDurationPill: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    rowDurationText: {
      fontSize: 10,
      color: '#fff',
      fontVariant: ['tabular-nums'],
    },
    rowBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    rowTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
    },
    rowMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    rowCategory: { fontSize: 11, color: c.textSecondary },
    rowPremiumBadge: {
      marginLeft: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
      backgroundColor: 'rgba(245,158,11,0.18)',
    },
    rowPremiumBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#F59E0B',
    },
  });
}
