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

import { Scrim } from '@/components/scrim';
import { GOLD, ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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
  difficulty: Difficulty;
  duration_seconds: number | null;
  is_featured: boolean;
  is_free: boolean;
};

type VideoCategory = 'all' | Video['category'];
type DifficultyFilter = 'all' | Difficulty;

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
    `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
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
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<DifficultyFilter>('all');

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  // 難易度ごとの色（初級=緑 / 中級=琥珀 / 上級=赤）。
  const diffColor = (d: Difficulty): string =>
    d === 'beginner' ? c.accent : d === 'intermediate' ? c.star : c.loss;
  const diffLabel = (d: Difficulty): string => t(`school.${d}`);

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
      videos.filter(
        (v) =>
          (selectedCategory === 'all' || v.category === selectedCategory) &&
          (selectedDifficulty === 'all' || v.difficulty === selectedDifficulty),
      ),
    [videos, selectedCategory, selectedDifficulty],
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

  const difficulties: { key: DifficultyFilter; label: string }[] = [
    { key: 'all', label: t('school.video_all') },
    { key: 'beginner', label: t('school.beginner') },
    { key: 'intermediate', label: t('school.intermediate') },
    { key: 'advanced', label: t('school.advanced') },
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
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="videocam-outline" size={28} color={c.textSecondary} />
          </View>
          <Text style={styles.emptyText}>{t('school.emptyVideos')}</Text>
        </View>
      }
      ListHeaderComponent={
        <View>
          {selectedCategory === 'all' &&
            selectedDifficulty === 'all' &&
            featuredVideos.length > 0 && (
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
                        activeOpacity={0.9}
                        style={styles.featuredCard}
                      >
                        <View style={styles.featuredThumbWrap}>
                          <Image
                            source={{ uri: getThumbnail(item) }}
                            style={styles.featuredThumb}
                            contentFit="cover"
                            transition={200}
                          />
                          <Scrim from={0.35} opacity={0.9} />
                          <View style={styles.playButton}>
                            <Ionicons name="play" size={22} color="#fff" />
                          </View>
                          <View style={styles.featuredTopRow}>
                            <View style={styles.diffBadge}>
                              <View
                                style={[
                                  styles.diffDot,
                                  { backgroundColor: diffColor(item.difficulty) },
                                ]}
                              />
                              <Text style={styles.diffBadgeText}>
                                {diffLabel(item.difficulty)}
                              </Text>
                            </View>
                            {locked && (
                              <View style={styles.premiumPill}>
                                <Ionicons name="lock-closed" size={9} color="#1A1407" />
                                <Text style={styles.premiumPillText}>PREMIUM</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.featuredBottom}>
                            <Text style={styles.featuredTitle} numberOfLines={2}>
                              {pickLocalized(item, 'title', lang)}
                            </Text>
                            <View style={styles.durationRow}>
                              <Ionicons
                                name="time-outline"
                                size={11}
                                color="rgba(255,255,255,0.85)"
                              />
                              <Text style={styles.durationText}>
                                {formatDuration(item.duration_seconds)}
                              </Text>
                            </View>
                          </View>
                        </View>
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
                  activeOpacity={0.8}
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

          {/* 難易度フィルタ（副次・小ぶりのアウトラインピル） */}
          <FlatList
            data={difficulties}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.diffFilterList}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const isActive = selectedDifficulty === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedDifficulty(item.key)}
                  activeOpacity={0.8}
                  style={[
                    styles.diffChip,
                    isActive && styles.diffChipActive,
                  ]}
                >
                  {item.key !== 'all' && (
                    <View
                      style={[
                        styles.diffChipDot,
                        { backgroundColor: diffColor(item.key as Difficulty) },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.diffChipText,
                      isActive && styles.diffChipTextActive,
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
            activeOpacity={0.75}
            style={styles.row}
          >
            <View style={styles.rowThumbWrap}>
              <Image
                source={{ uri: getThumbnail(item) }}
                style={styles.rowThumb}
                contentFit="cover"
                transition={150}
              />
              <Scrim from={0.45} opacity={0.55} />
              <View style={styles.rowPlay}>
                <Ionicons name="play" size={13} color="#fff" />
              </View>
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
                <View style={styles.rowDiff}>
                  <View
                    style={[
                      styles.diffDot,
                      { backgroundColor: diffColor(item.difficulty) },
                    ]}
                  />
                  <Text style={styles.rowDiffText}>{diffLabel(item.difficulty)}</Text>
                </View>
                <View style={styles.metaDot} />
                <Text style={styles.rowCategory}>
                  {t(`school.video_${item.category}`)}
                </Text>
                {locked && (
                  <View style={styles.rowPremiumBadge}>
                    <Ionicons name="lock-closed" size={8} color={GOLD} />
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
    emptyWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40 },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    featuredBlock: { marginBottom: 12, paddingTop: 12 },
    sectionLabel: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    featuredList: { paddingHorizontal: 16 },
    featuredCard: { width: 300, marginHorizontal: 4 },
    featuredThumbWrap: {
      width: 300,
      height: 170,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    featuredThumb: { ...StyleSheet.absoluteFillObject },
    playButton: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 52,
      height: 52,
      marginTop: -26,
      marginLeft: -26,
      borderRadius: 26,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 3,
    },
    featuredTopRow: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    diffBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    diffDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    diffBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.2,
    },
    premiumPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: GOLD,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },
    premiumPillText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#1A1407',
      letterSpacing: 0.5,
    },
    featuredBottom: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 11,
    },
    featuredTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
    },
    durationText: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.85)',
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    categoryList: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 18,
      marginHorizontal: 4,
    },
    categoryChipActive: { backgroundColor: c.accent },
    categoryChipInactive: { backgroundColor: c.surfaceAlt },
    categoryChipText: { fontSize: 13 },
    categoryChipTextActive: { color: c.onAccent, fontWeight: '800' },
    categoryChipTextInactive: { color: c.textSecondary, fontWeight: '600' },
    diffFilterList: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 8,
    },
    diffChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      marginHorizontal: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    diffChipActive: {
      borderColor: c.textPrimary,
      backgroundColor: c.surfaceAlt,
    },
    diffChipDot: { width: 6, height: 6, borderRadius: 3 },
    diffChipText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    diffChipTextActive: { color: c.textPrimary, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 9,
    },
    rowThumbWrap: {
      width: 150,
      height: 86,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: c.surfaceAlt,
    },
    rowThumb: { ...StyleSheet.absoluteFillObject },
    rowPlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 30,
      height: 30,
      marginTop: -15,
      marginLeft: -15,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 2,
    },
    rowDurationPill: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.78)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    rowDurationText: {
      fontSize: 10,
      color: '#fff',
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    rowBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    rowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
      lineHeight: 19,
    },
    rowMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
    rowDiff: { flexDirection: 'row', alignItems: 'center' },
    rowDiffText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.textSecondary,
      marginHorizontal: 7,
      opacity: 0.6,
    },
    rowCategory: { fontSize: 11, color: c.textSecondary },
    rowPremiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginLeft: 8,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: `${GOLD}1F`,
    },
    rowPremiumBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: GOLD,
      letterSpacing: 0.4,
    },
  });
}
