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
      renderItem={({ item: cat, index: catIndex }) => (
        <View style={styles.categoryBlock}>
          <View
            style={[
              styles.categoryHead,
              catIndex > 0 && styles.categoryHeadSpaced,
            ]}
          >
            <Text style={styles.categoryName}>
              {pickLocalized(cat, 'name', lang)}
            </Text>
            <Text style={styles.categoryMeta}>
              {cat.lessons.length} {t('school.lessons')}
            </Text>
          </View>

          {cat.lessons.map((lesson, index) => {
            const locked = !lesson.is_free && !isPremium;
            const isLast = index === cat.lessons.length - 1;
            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.5}
                style={[
                  styles.lessonRow,
                  !isLast && styles.lessonRowDivider,
                ]}
              >
                <Text style={styles.lessonNum}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.lessonBody}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      locked && styles.lessonTitleLocked,
                    ]}
                  >
                    {pickLocalized(lesson, 'title', lang)}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {lesson.duration_minutes}
                    {t('school.minutes')}
                  </Text>
                </View>
                <Ionicons
                  name={locked ? 'lock-closed-outline' : 'chevron-forward'}
                  size={15}
                  color={c.textSecondary}
                  style={locked ? styles.iconLocked : styles.iconChevron}
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
      paddingTop: 8,
      paddingBottom: 56,
    },
    categoryBlock: {},
    categoryHead: {
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    categoryHeadSpaced: {
      marginTop: 36,
    },
    categoryName: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    categoryMeta: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    lessonRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    lessonNum: {
      fontSize: 13,
      fontWeight: '400',
      color: c.textSecondary,
      width: 28,
      fontVariant: ['tabular-nums'],
      opacity: 0.6,
    },
    lessonBody: { flex: 1 },
    lessonTitle: {
      fontSize: 16,
      fontWeight: '400',
      color: c.textPrimary,
      letterSpacing: -0.1,
    },
    lessonTitleLocked: {
      color: c.textSecondary,
    },
    lessonMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
      opacity: 0.7,
    },
    iconChevron: { opacity: 0.3 },
    iconLocked: { opacity: 0.4 },
  });
}
