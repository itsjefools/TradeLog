import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
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
  youtube_video_id: string | null;
  video_source: 'youtube' | 'cloudflare';
  stream_uid: string | null;
  is_free: boolean;
  duration_seconds: number | null;
  category: string;
  difficulty: string;
};

// Premium動画(Cloudflare)の取得状態。
type HostedState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unconfigured' // 管理者がCloudflareを未設定（503）
  | 'error';

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

  // Cloudflare(Premium)再生用の署名付きURLと状態。
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [hostedState, setHostedState] = useState<HostedState>('idle');
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

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

  // Cloudflare動画なら、Edge Function で会員チェック＋署名付きURLを取得する。
  useEffect(() => {
    if (!video || video.video_source !== 'cloudflare') return;
    let cancelled = false;
    (async () => {
      setHostedState('loading');
      const { data, error } = await supabase.functions.invoke(
        'school-video-token',
        { body: { videoId: video.id } },
      );
      if (cancelled) return;
      if (error) {
        // 非会員(403)は購入導線へ。未設定(503)は「準備中」。それ以外はエラー。
        const status =
          (error as { context?: Response }).context?.status ?? 0;
        if (status === 403) {
          router.replace('/school/premium');
          return;
        }
        setHostedState(status === 503 ? 'unconfigured' : 'error');
        return;
      }
      const url = (data as { url?: string } | null)?.url ?? null;
      if (!url) {
        setHostedState('error');
        return;
      }
      setHostedUrl(url);
      setHostedState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [video, router]);

  // 署名付きURLが取れたら再生開始。
  useEffect(() => {
    if (hostedState === 'ready' && hostedUrl) {
      player.replace({ uri: hostedUrl });
      player.play();
    }
  }, [hostedState, hostedUrl, player]);

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
  const isHosted = video.video_source === 'cloudflare';

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

      <View style={[styles.playerWrap, { height: playerHeight }]}>
        {isHosted ? (
          hostedState === 'ready' ? (
            <VideoView
              player={player}
              style={{ width, height: playerHeight }}
              contentFit="contain"
              allowsFullscreen
              nativeControls
            />
          ) : (
            <View style={[styles.playerPlaceholder, { height: playerHeight }]}>
              {hostedState === 'loading' || hostedState === 'idle' ? (
                <ActivityIndicator size="large" color={c.accent} />
              ) : (
                <View style={styles.placeholderContent}>
                  <Ionicons
                    name={
                      hostedState === 'unconfigured'
                        ? 'time-outline'
                        : 'alert-circle-outline'
                    }
                    size={30}
                    color={c.textSecondary}
                  />
                  <Text style={styles.placeholderText}>
                    {hostedState === 'unconfigured'
                      ? t('school.content_coming_soon')
                      : t('school.videoUnavailable')}
                  </Text>
                </View>
              )}
            </View>
          )
        ) : (
          <YoutubePlayer
            height={playerHeight}
            width={width}
            play={playing}
            videoId={video.youtube_video_id ?? ''}
            onChangeState={onStateChange}
            webViewProps={{ allowsFullscreenVideo: true }}
          />
        )}
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
    playerWrap: { backgroundColor: '#000', justifyContent: 'center' },
    playerPlaceholder: {
      width: '100%',
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderContent: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
    placeholderText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
    },
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
