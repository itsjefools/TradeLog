import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SchoolLessons } from '@/components/school/school-lessons';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';

type SchoolTab = 'lessons' | 'videos' | 'books' | 'community';

export default function SchoolScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [activeTab, setActiveTab] = useState<SchoolTab>('lessons');

  const tabs: { key: SchoolTab; label: string; icon: string }[] = [
    { key: 'lessons', label: t('school.tab_lessons'), icon: '📖' },
    { key: 'videos', label: t('school.tab_videos'), icon: '🎬' },
    { key: 'books', label: t('school.tab_books'), icon: '📚' },
    { key: 'community', label: t('school.tab_community'), icon: '👥' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'lessons':
        return <SchoolLessons />;
      case 'videos':
        return <ComingSoon label={t('school.tab_videos')} />;
      case 'books':
        return <ComingSoon label={t('school.tab_books')} />;
      case 'community':
        return <ComingSoon label={t('school.tab_community')} />;
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
                  styles.tabChip,
                  isActive ? styles.tabChipActive : styles.tabChipInactive,
                ]}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
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

function ComingSoon({ label }: { label: string }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.comingWrap}>
      <Text style={styles.comingEmoji}>🚧</Text>
      <Text style={styles.comingLabel}>{label}</Text>
      <Text style={styles.comingHint}>Coming soon</Text>
    </View>
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
      fontSize: 26,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    tabBarWrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabBarContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    tabChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    tabChipActive: {
      backgroundColor: c.accent,
    },
    tabChipInactive: {
      backgroundColor: c.surfaceAlt,
    },
    tabIcon: {
      fontSize: 14,
      marginRight: 6,
    },
    tabLabel: {
      fontSize: 13,
    },
    tabLabelActive: {
      color: c.onAccent,
      fontWeight: '700',
    },
    tabLabelInactive: {
      color: c.textSecondary,
      fontWeight: '500',
    },
    body: { flex: 1 },
    comingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    comingEmoji: { fontSize: 40, marginBottom: 12 },
    comingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 6,
    },
    comingHint: {
      fontSize: 13,
      color: c.textSecondary,
    },
  });
}
