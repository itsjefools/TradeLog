import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<SchoolTab>('lessons');

  const tabs: { key: SchoolTab; label: string }[] = [
    { key: 'lessons', label: t('school.tab_lessons') },
    { key: 'videos', label: t('school.tab_videos') },
    { key: 'books', label: t('school.tab_books') },
    { key: 'community', label: t('school.tab_community') },
  ];

  const renderContent = () => {
    switch (activeTab) {
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
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                ]}
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

      <View style={styles.body}>{renderContent()}</View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 6,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    tabBarWrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabBarContent: {
      paddingHorizontal: 20,
    },
    tabItem: {
      paddingVertical: 14,
      paddingHorizontal: 4,
      marginRight: 24,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: c.accent,
    },
    tabLabel: {
      fontSize: 15,
    },
    tabLabelActive: {
      color: c.textPrimary,
      fontWeight: '700',
    },
    tabLabelInactive: {
      color: c.textSecondary,
      fontWeight: '500',
    },
    body: { flex: 1 },
  });
}
