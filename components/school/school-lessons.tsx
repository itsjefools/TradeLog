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
type IoniconName = keyof typeof Ionicons.glyphMap;

const DIFFICULTY_COLOR: Record<Lesson['difficulty'], string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

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
      ListFooterComponent={
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerText}>
            {t('school.disclaimer')}
          </Text>
        </View>
      }
      renderItem={({ item: cat, index: catIndex }) => {
        const catColor = cat.color || c.accent;
        return (
          <View style={styles.categoryBlock}>
            <View
              style={[
                styles.categoryHead,
                catIndex > 0 && styles.categoryHeadSpaced,
              ]}
            >
              <View
                style={[styles.catIcon, { backgroundColor: `${catColor}1F` }]}
              >
                <Ionicons
                  name={(cat.icon as IoniconName) || 'school-outline'}
                  size={20}
                  color={catColor}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.categoryName}>
                  {pickLocalized(cat, 'name', lang)}
                </Text>
                <Text style={styles.categoryMeta}>
                  {cat.lessons.length} {t('school.lessons')}
                </Text>
              </View>
            </View>

            <View style={styles.lessonCard}>
              {cat.lessons.map((lesson, index) => {
                const locked = !lesson.is_free && !isPremium;
                const isLast = index === cat.lessons.length - 1;
                const diffColor = DIFFICULTY_COLOR[lesson.difficulty];
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    onPress={() => handleLessonPress(lesson)}
                    activeOpacity={0.6}
                    style={[styles.lessonRow, !isLast && styles.lessonRowDivider]}
                  >
                    <View
                      style={[styles.lessonDot, { backgroundColor: catColor }]}
                    />
                    <View style={styles.lessonBody}>
                      <Text
                        style={[
                          styles.lessonTitle,
                          locked && styles.lessonTitleLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {pickLocalized(lesson, 'title', lang)}
                      </Text>
                      <View style={styles.lessonMetaRow}>
                        <View
                          style={[
                            styles.diffBadge,
                            { backgroundColor: `${diffColor}1A` },
                          ]}
                        >
                          <Text style={[styles.diffText, { color: diffColor }]}>
                            {t(`school.${lesson.difficulty}`)}
                          </Text>
                        </View>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={c.textSecondary}
                        />
                        <Text style={styles.lessonMeta}>
                          {lesson.duration_minutes}
                          {t('school.minutes')}
                        </Text>
                        {lesson.is_free && (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeText}>FREE</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name={locked ? 'lock-closed' : 'chevron-forward'}
                      size={16}
                      color={locked ? catColor : c.textSecondary}
                      style={locked ? undefined : styles.iconChevron}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    flex: { flex: 1 },
    listContent: {
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 56,
    },
    categoryBlock: {},
    categoryHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    categoryHeadSpaced: {
      marginTop: 32,
    },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryName: {
      fontSize: 19,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    categoryMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 1,
    },
    lessonCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    lessonRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    lessonDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    lessonBody: { flex: 1, gap: 6 },
    lessonTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      letterSpacing: -0.1,
      lineHeight: 20,
    },
    lessonTitleLocked: {
      color: c.textSecondary,
    },
    lessonMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    diffBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    diffText: {
      fontSize: 10,
      fontWeight: '700',
    },
    lessonMeta: {
      fontSize: 12,
      color: c.textSecondary,
    },
    freeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: `${c.accent}1A`,
      marginLeft: 'auto',
    },
    freeText: {
      fontSize: 9,
      fontWeight: '800',
      color: c.accent,
      letterSpacing: 0.5,
    },
    iconChevron: { opacity: 0.4 },
    disclaimerWrap: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      marginTop: 16,
    },
    disclaimerText: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 18,
      opacity: 0.6,
      textAlign: 'center',
    },
  });
}
