import { Ionicons } from '@expo/vector-icons';
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

type Category = {
  id: string;
  name_ja: string;
  name_en: string;
  name_pt: string;
  name_es: string;
  icon: string;
  color: string;
  sort_order: number;
};

type Lesson = {
  id: string;
  category_id: string;
  title_ja: string;
  title_en: string;
  title_pt: string;
  title_es: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_free: boolean;
  sort_order: number;
};

type CategoryWithLessons = Category & { lessons: Lesson[] };

function pickLocalized<
  T extends Record<string, unknown>,
  F extends string,
>(item: T, field: F, locale: Locale): string {
  const localized = item[`${field}_${locale}` as keyof T];
  if (typeof localized === 'string' && localized.length > 0) return localized;
  const fallbackEn = item[`${field}_en` as keyof T];
  if (typeof fallbackEn === 'string' && fallbackEn.length > 0) return fallbackEn;
  const fallbackJa = item[`${field}_ja` as keyof T];
  if (typeof fallbackJa === 'string') return fallbackJa;
  return '';
}

function difficultyColor(d: Lesson['difficulty'], c: ThemeColors): string {
  switch (d) {
    case 'beginner':
      return c.win;
    case 'intermediate':
      return '#3B82F6';
    case 'advanced':
      return '#F59E0B';
    default:
      return c.textSecondary;
  }
}

export function SchoolLessons() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isPremium } = usePremium();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [categories, setCategories] = useState<CategoryWithLessons[]>([]);
  const [loading, setLoading] = useState(true);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: cats }, { data: lessons }] = await Promise.all([
          supabase
            .from('school_categories')
            .select('*')
            .order('sort_order', { ascending: true }),
          supabase
            .from('school_lessons')
            .select('*')
            .order('sort_order', { ascending: true }),
        ]);
        if (cancelled) return;
        const merged: CategoryWithLessons[] = (cats ?? []).map(
          (cat: Category) => ({
            ...cat,
            lessons: (lessons ?? []).filter(
              (l: Lesson) => l.category_id === cat.id,
            ),
          }),
        );
        setCategories(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLessonPress = (lesson: Lesson) => {
    if (!lesson.is_free && !isPremium) {
      router.push('/school/premium');
      return;
    }
    router.push(`/school/lesson/${lesson.id}`);
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
      data={categories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item: cat }) => (
        <View style={styles.categoryBlock}>
          <View style={styles.categoryHead}>
            <View
              style={[styles.categoryIconWrap, { backgroundColor: `${cat.color}25` }]}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={cat.color}
              />
            </View>
            <View style={styles.categoryTitleWrap}>
              <Text style={styles.categoryName}>
                {pickLocalized(cat, 'name', lang)}
              </Text>
              <Text style={styles.categoryMeta}>
                {cat.lessons.length} {t('school.lessons')}
              </Text>
            </View>
          </View>

          {cat.lessons.map((lesson, index) => {
            const diffColor = difficultyColor(lesson.difficulty, c);
            const locked = !lesson.is_free && !isPremium;
            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.7}
                style={styles.lessonRow}
              >
                <Text style={[styles.lessonNum, { color: diffColor }]}>
                  {index + 1}
                </Text>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle}>
                    {pickLocalized(lesson, 'title', lang)}
                  </Text>
                  <View style={styles.lessonMetaRow}>
                    <Text style={styles.lessonDuration}>
                      {lesson.duration_minutes}
                      {t('school.minutes')}
                    </Text>
                    <View style={styles.metaDot} />
                    <Text style={[styles.lessonDifficulty, { color: diffColor }]}>
                      {t(`school.${lesson.difficulty}`)}
                    </Text>
                  </View>
                </View>
                {locked ? (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                ) : lesson.is_free ? (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                ) : null}
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={c.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: {
      padding: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    categoryBlock: {
      marginBottom: 24,
    },
    categoryHead: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    categoryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    categoryTitleWrap: {
      flex: 1,
    },
    categoryName: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    categoryMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
      borderRadius: 10,
      marginBottom: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    lessonNum: {
      fontSize: 13,
      fontWeight: '700',
      width: 24,
    },
    lessonBody: {
      flex: 1,
    },
    lessonTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
    },
    lessonMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
    },
    lessonDuration: {
      fontSize: 11,
      color: c.textSecondary,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.textSecondary,
      marginHorizontal: 6,
    },
    lessonDifficulty: {
      fontSize: 11,
    },
    premiumBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      marginRight: 8,
    },
    premiumBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#F59E0B',
      letterSpacing: 0.4,
    },
    freeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.18)',
      marginRight: 8,
    },
    freeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
      letterSpacing: 0.4,
    },
  });
}
