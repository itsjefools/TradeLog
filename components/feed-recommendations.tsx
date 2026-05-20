import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type FeaturedVideo = {
  id: string;
  title_ja: string;
  title_en: string | null;
  title_pt: string | null;
  title_es: string | null;
  youtube_video_id: string;
};

type FeaturedBook = {
  id: string;
  title_ja: string;
  title_en: string | null;
  title_pt: string | null;
  title_es: string | null;
  cover_image_url: string | null;
  affiliate_url_ja: string | null;
  affiliate_url_en: string | null;
  affiliate_url_pt: string | null;
  affiliate_url_es: string | null;
};

function pickTitle<T extends Record<string, unknown>>(item: T, lang: Locale): string {
  const localized = item[`title_${lang}` as keyof T];
  if (typeof localized === 'string' && localized.length > 0) return localized;
  const en = item.title_en;
  if (typeof en === 'string' && en.length > 0) return en;
  const ja = item.title_ja;
  return typeof ja === 'string' ? ja : '';
}

function pickAffiliate(book: FeaturedBook, lang: Locale): string | null {
  const localized = book[`affiliate_url_${lang}` as keyof FeaturedBook];
  if (typeof localized === 'string' && localized.length > 0) return localized;
  if (book.affiliate_url_en) return book.affiliate_url_en;
  if (book.affiliate_url_ja) return book.affiliate_url_ja;
  return null;
}

export function FeedRecommendations() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [books, setBooks] = useState<FeaturedBook[]>([]);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: v }, { data: b }] = await Promise.all([
        supabase
          .from('school_videos')
          .select('id, title_ja, title_en, title_pt, title_es, youtube_video_id')
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
          .limit(6),
        supabase
          .from('school_books')
          .select(
            'id, title_ja, title_en, title_pt, title_es, cover_image_url, affiliate_url_ja, affiliate_url_en, affiliate_url_pt, affiliate_url_es',
          )
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
          .limit(6),
      ]);
      if (cancelled) return;
      setVideos((v ?? []) as FeaturedVideo[]);
      setBooks((b ?? []) as FeaturedBook[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openBook = async (book: FeaturedBook) => {
    const url = pickAffiliate(book, lang);
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  if (videos.length === 0 && books.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {videos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recommended_videos')}</Text>
            <TouchableOpacity onPress={() => router.push('/school')} hitSlop={6}>
              <Text style={styles.seeAll}>{t('home.see_all')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={videos}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videoList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/school/video/${item.id}`)}
                activeOpacity={0.85}
                style={styles.videoCard}
              >
                <Image
                  source={{
                    uri: `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`,
                  }}
                  style={styles.videoThumb}
                  contentFit="cover"
                />
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {pickTitle(item, lang)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {books.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recommended_books')}</Text>
            <TouchableOpacity onPress={() => router.push('/school')} hitSlop={6}>
              <Text style={styles.seeAll}>{t('home.see_all')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={books}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openBook(item)}
                activeOpacity={0.85}
                style={styles.bookCard}
              >
                {item.cover_image_url ? (
                  <Image
                    source={{ uri: item.cover_image_url }}
                    style={styles.bookCover}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.bookCoverPlaceholder}>
                    <Ionicons name="book" size={24} color={c.textSecondary} />
                  </View>
                )}
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {pickTitle(item, lang)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingTop: 8, paddingBottom: 4 },
    section: { marginBottom: 16 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    seeAll: {
      fontSize: 13,
      color: c.accent,
      fontWeight: '600',
    },
    videoList: { paddingHorizontal: 16, gap: 8 },
    videoCard: { width: 200, marginHorizontal: 4 },
    videoThumb: {
      width: 200,
      height: 112,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    videoTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      marginTop: 6,
    },
    bookList: { paddingHorizontal: 16, gap: 8 },
    bookCard: { width: 100, marginHorizontal: 4 },
    bookCover: {
      width: 100,
      height: 145,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
    },
    bookCoverPlaceholder: {
      width: 100,
      height: 145,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textPrimary,
      marginTop: 6,
    },
  });
}
