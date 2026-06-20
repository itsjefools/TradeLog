import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SchoolBooks } from '@/components/school/school-books';
import { SchoolCommunity } from '@/components/school/school-community';
import { SchoolLessons } from '@/components/school/school-lessons';
import { SchoolVideos } from '@/components/school/school-videos';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';

type SchoolTab = 'lessons' | 'videos' | 'books' | 'community';

export default function SchoolScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // 表示済みページだけ実体をマウント（初回に4つ同時フェッチしないため）。
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));

  const tabs: { key: SchoolTab; label: string }[] = [
    { key: 'lessons', label: t('school.tab_lessons') },
    { key: 'videos', label: t('school.tab_videos') },
    { key: 'books', label: t('school.tab_books') },
    { key: 'community', label: t('school.tab_community') },
  ];

  const goTo = (index: number) => {
    pagerRef.current?.setPage(index);
    // onPageSelected でも更新されるが、タップ時の即時反映用
    setActiveIndex(index);
    setVisited((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  };

  const renderPage = (key: SchoolTab) => {
    switch (key) {
      case 'lessons':
        return <SchoolLessons />;
      case 'videos':
        return <SchoolVideos />;
      case 'books':
        return <SchoolBooks />;
      case 'community':
        return <SchoolCommunity />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('school.title')}</Text>
      </View>

      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab, i) => {
            const isActive = activeIndex === i;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => goTo(i)}
                activeOpacity={0.7}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={(e) => {
          // ドラッグ中に向かう先のページを先読みマウント（空白防止）。
          const { position, offset } = e.nativeEvent;
          const target = offset > 0 ? position + 1 : position;
          setVisited((prev) => (prev.has(target) ? prev : new Set(prev).add(target)));
        }}
        onPageSelected={(e) => {
          const index = e.nativeEvent.position;
          setActiveIndex(index);
          setVisited((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
        }}
      >
        {tabs.map((tab, i) => (
          <View key={tab.key} style={styles.page} collapsable={false}>
            {visited.has(i) ? renderPage(tab.key) : null}
          </View>
        ))}
      </PagerView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 4,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.8,
    },
    tabBarWrap: {
      paddingHorizontal: 24,
      marginTop: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabBarContent: {
      // 横スクロール用。タブは marginRight で間隔
    },
    tabItem: {
      paddingBottom: 12,
      marginRight: 28,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: c.textPrimary,
    },
    tabLabel: {
      fontSize: 15,
      letterSpacing: 0.2,
    },
    tabLabelActive: {
      color: c.textPrimary,
      fontWeight: '600',
    },
    tabLabelInactive: {
      color: c.textSecondary,
      fontWeight: '400',
    },
    pager: { flex: 1 },
    page: { flex: 1 },
  });
}
