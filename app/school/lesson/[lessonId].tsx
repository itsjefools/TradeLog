import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnhancedMarkdown } from '@/components/school/enhanced-markdown';
import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Lesson = {
  id: string;
  title_ja: string;
  title_en: string | null;
  title_pt: string | null;
  title_es: string | null;
  content_ja: string | null;
  content_en: string | null;
  content_pt: string | null;
  content_es: string | null;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_free: boolean;
};

function pickLocalized(lesson: Lesson, field: 'title' | 'content', lang: Locale): string {
  const key = `${field}_${lang}` as keyof Lesson;
  const v = lesson[key];
  if (typeof v === 'string' && v.length > 0) return v;
  const en = lesson[`${field}_en` as keyof Lesson];
  if (typeof en === 'string' && en.length > 0) return en;
  const ja = lesson[`${field}_ja` as keyof Lesson];
  if (typeof ja === 'string') return ja;
  return '';
}

export default function LessonDetailScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t, locale } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(
    locale as Locale,
  )
    ? (locale as Locale)
    : 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lessonId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('school_lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();
      if (cancelled) return;
      setLesson((data ?? null) as Lesson | null);
      setLoading(false);

      if (data && session?.user.id) {
        const { data: progress } = await supabase
          .from('user_lesson_progress')
          .select('is_completed')
          .eq('user_id', session.user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        if (!cancelled && progress?.is_completed) {
          setCompleted(true);
        }
        await supabase
          .from('user_lesson_progress')
          .upsert(
            {
              user_id: session.user.id,
              lesson_id: lessonId,
              last_read_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,lesson_id' },
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, session?.user.id]);

  const markAsCompleted = useCallback(async () => {
    if (!lessonId || !session?.user.id) return;
    const next = !completed;
    setCompleted(next);
    await supabase
      .from('user_lesson_progress')
      .upsert(
        {
          user_id: session.user.id,
          lesson_id: lessonId,
          is_completed: next,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' },
      );
    if (next) toast.success(t('school.completed'));
  }, [completed, lessonId, session?.user.id, t, toast]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.notFound}>{t('school.lessonNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = pickLocalized(lesson, 'title', lang);
  const content = pickLocalized(lesson, 'content', lang);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <View style={styles.lessonHeader}>
          <Text style={styles.eyebrow}>
            {lesson.duration_minutes}
            {t('school.minutes')} {t('school.read_label')}
          </Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.contentWrap}>
          {content ? (
            <EnhancedMarkdown text={content} c={c} isDark={isDark} />
          ) : (
            <View style={styles.comingCard}>
              <Text style={styles.comingEmoji}>📝</Text>
              <Text style={styles.comingTitle}>
                {t('school.content_coming_soon')}
              </Text>
              <Text style={styles.comingDesc}>
                {t('school.content_coming_soon_desc')}
              </Text>
            </View>
          )}
        </View>

        {content ? (
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              onPress={markAsCompleted}
              activeOpacity={0.7}
              style={[
                styles.completeButton,
                completed && styles.completeButtonDone,
              ]}
            >
              {completed ? (
                <View style={styles.completeRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={c.accent}
                  />
                  <Text
                    style={[styles.completeText, styles.completeTextDone]}
                  >
                    {t('school.completed')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.completeText}>
                  {t('school.mark_complete')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
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
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    headerSpacer: { width: 26 },
    body: {
      paddingBottom: 60,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFound: { fontSize: 14, color: c.textSecondary },
    lessonHeader: {
      paddingHorizontal: 28,
      paddingTop: 8,
      paddingBottom: 32,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 12,
      opacity: 0.6,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
      lineHeight: 36,
    },
    contentWrap: {
      paddingHorizontal: 28,
    },
    comingCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 28,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    comingEmoji: { fontSize: 40, marginBottom: 12 },
    comingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 6,
    },
    comingDesc: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
    },
    actionsWrap: {
      paddingHorizontal: 28,
      marginTop: 40,
    },
    completeButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
    },
    completeButtonDone: {
      backgroundColor: `${c.accent}14`,
    },
    completeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    completeText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
    completeTextDone: {
      color: c.accent,
    },
  });
}
