import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Lesson = {
  id: string;
  title_ja: string;
  title_en: string;
  title_pt: string;
  title_es: string;
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
  const { t, locale } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

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

      // 既読記録
      if (data && session?.user.id) {
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
          <Text style={styles.headerTitle}>{t('school.tab_lessons')}</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.metaDifficulty}>
            {t(`school.${lesson.difficulty}`)}
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaDuration}>
            {lesson.duration_minutes}
            {t('school.minutes')}
          </Text>
        </View>

        {content ? (
          <SimpleMarkdown text={content} c={c} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

function SimpleMarkdown({ text, c }: { text: string; c: ThemeColors }) {
  const styles = useMemo(() => makeMarkdownStyles(c), [c]);
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <Text key={i} style={[styles.h1, i > 0 && styles.h1Spaced]}>
              {line.slice(2)}
            </Text>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <Text key={i} style={styles.h2}>
              {line.slice(3)}
            </Text>
          );
        }
        if (line.startsWith('- ')) {
          const cleaned = line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1');
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{cleaned}</Text>
            </View>
          );
        }
        if (line.trim() === '') {
          return <View key={i} style={styles.spacer} />;
        }
        const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <Text key={i} style={styles.paragraph}>
            {cleaned}
          </Text>
        );
      })}
    </View>
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
    body: {
      padding: 20,
      paddingBottom: 60,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFound: { fontSize: 14, color: c.textSecondary },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    metaDifficulty: {
      fontSize: 13,
      color: c.accent,
      fontWeight: '600',
    },
    metaSep: {
      fontSize: 13,
      color: c.textSecondary,
      marginHorizontal: 8,
    },
    metaDuration: {
      fontSize: 13,
      color: c.textSecondary,
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
  });
}

function makeMarkdownStyles(c: ThemeColors) {
  return StyleSheet.create({
    h1: {
      fontSize: 22,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 12,
    },
    h1Spaced: { marginTop: 20 },
    h2: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 10,
      marginTop: 16,
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: 6,
      paddingLeft: 4,
    },
    bulletDot: {
      fontSize: 15,
      color: c.accent,
      marginRight: 8,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
      lineHeight: 22,
    },
    paragraph: {
      fontSize: 15,
      color: c.textPrimary,
      lineHeight: 24,
      marginBottom: 6,
    },
    spacer: { height: 8 },
  });
}
