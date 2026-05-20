import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
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
  duration_seconds: number | null;
  category: string;
  difficulty: string;
};

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

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!videoId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('school_videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();
      if (cancelled) return;
      setVideo((data ?? null) as Video | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') setPlaying(false);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('school.tab_videos')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.notFound}>{t('school.videoNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const playerHeight = Math.round(width * (9 / 16));
  const title = pickLocalized(video, 'title', lang);
  const description = pickLocalized(video, 'description', lang);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.playerWrap}>
        <YoutubePlayer
          height={playerHeight}
          width={width}
          play={playing}
          videoId={video.youtube_video_id}
          onChangeState={onStateChange}
          webViewProps={{ allowsFullscreenVideo: true }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaCategory}>
            {t(`school.video_${video.category}`)}
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaDifficulty}>
            {t(`school.${video.difficulty}`)}
          </Text>
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginHorizontal: 12,
    },
    headerSpacer: { width: 26 },
    playerWrap: { backgroundColor: '#000' },
    body: { padding: 20, paddingBottom: 60 },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 8,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    metaCategory: { fontSize: 12, color: c.textSecondary },
    metaSep: { fontSize: 12, color: c.textSecondary, marginHorizontal: 8 },
    metaDifficulty: { fontSize: 12, color: c.accent, fontWeight: '600' },
    description: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 21,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFound: { fontSize: 14, color: c.textSecondary },
  });
}
