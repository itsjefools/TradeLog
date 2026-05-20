import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

type Book = {
  id: string;
  title_ja: string;
  title_en: string | null;
  title_pt: string | null;
  title_es: string | null;
  author: string;
  description_ja: string | null;
  description_en: string | null;
  description_pt: string | null;
  description_es: string | null;
  cover_image_url: string | null;
  affiliate_url_ja: string | null;
  affiliate_url_en: string | null;
  affiliate_url_pt: string | null;
  affiliate_url_es: string | null;
  category: string;
  difficulty: string;
  rating: number;
  is_featured: boolean;
};

function pickLocalized(book: Book, field: 'title' | 'description', lang: Locale): string {
  const key = `${field}_${lang}` as keyof Book;
  const v = book[key];
  if (typeof v === 'string' && v.length > 0) return v;
  const en = book[`${field}_en` as keyof Book];
  if (typeof en === 'string' && en.length > 0) return en;
  const ja = book[`${field}_ja` as keyof Book];
  if (typeof ja === 'string') return ja;
  return '';
}

function pickAffiliateUrl(book: Book, lang: Locale): string | null {
  const candidate = book[`affiliate_url_${lang}` as keyof Book];
  if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  if (book.affiliate_url_en) return book.affiliate_url_en;
  if (book.affiliate_url_ja) return book.affiliate_url_ja;
  return null;
}

export function SchoolBooks() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('school_books')
        .select('*')
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setBooks((data ?? []) as Book[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredBooks = useMemo(() => books.filter((b) => b.is_featured), [books]);

  const handleBookPress = async (book: Book) => {
    const url = pickAffiliateUrl(book, lang);
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  const renderStars = (rating: number) => {
    const filled = Math.round(rating);
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= filled ? 'star' : 'star-outline'}
          size={12}
          color={i <= filled ? c.star : c.textSecondary}
          style={styles.starIcon}
        />,
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
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
      data={books}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        featuredBooks.length > 0 ? (
          <View style={styles.featuredBlock}>
            <Text style={styles.sectionLabel}>{t('school.recommended_books')}</Text>
            <FlatList
              data={featuredBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              keyExtractor={(item) => `featured-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleBookPress(item)}
                  activeOpacity={0.85}
                  style={styles.featuredCard}
                >
                  {item.cover_image_url ? (
                    <Image
                      source={{ uri: item.cover_image_url }}
                      style={styles.featuredCover}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.featuredCoverPlaceholder}>
                      <Ionicons name="book" size={32} color={c.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.featuredTitle} numberOfLines={2}>
                    {pickLocalized(item, 'title', lang)}
                  </Text>
                  <Text style={styles.featuredAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => handleBookPress(item)}
          activeOpacity={0.7}
          style={styles.row}
        >
          {item.cover_image_url ? (
            <Image
              source={{ uri: item.cover_image_url }}
              style={styles.rowCover}
              contentFit="cover"
            />
          ) : (
            <View style={styles.rowCoverPlaceholder}>
              <Ionicons name="book" size={20} color={c.textSecondary} />
            </View>
          )}
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {pickLocalized(item, 'title', lang)}
            </Text>
            <Text style={styles.rowAuthor}>{item.author}</Text>
            {item.rating > 0 && (
              <View style={styles.rowRating}>
                {renderStars(item.rating)}
                <Text style={styles.rowRatingValue}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
            {pickLocalized(item, 'description', lang) ? (
              <Text style={styles.rowDescription} numberOfLines={2}>
                {pickLocalized(item, 'description', lang)}
              </Text>
            ) : null}
          </View>
          <View style={styles.rowExternalIcon}>
            <Ionicons name="open-outline" size={16} color={c.textSecondary} />
          </View>
        </TouchableOpacity>
      )}
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
    featuredCard: { width: 130, marginHorizontal: 6 },
    featuredCover: {
      width: 130,
      height: 190,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
    },
    featuredCoverPlaceholder: {
      width: 130,
      height: 190,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featuredTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      marginTop: 8,
    },
    featuredAuthor: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowCover: {
      width: 60,
      height: 88,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
    },
    rowCoverPlaceholder: {
      width: 60,
      height: 88,
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowBody: { flex: 1, marginLeft: 14, justifyContent: 'center' },
    rowTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
    },
    rowAuthor: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    rowRating: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    rowRatingValue: {
      fontSize: 11,
      color: c.textSecondary,
      marginLeft: 4,
    },
    rowDescription: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
      lineHeight: 17,
    },
    rowExternalIcon: {
      justifyContent: 'center',
      paddingLeft: 8,
    },
    starsRow: { flexDirection: 'row' },
    starIcon: { marginRight: 1 },
  });
}
