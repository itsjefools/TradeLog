import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WallpaperEditor } from '@/components/wallpaper/wallpaper-editor';
import { WallpaperGallery } from '@/components/wallpaper/wallpaper-gallery';
import { WallpaperTemplates } from '@/components/wallpaper/wallpaper-templates';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';

type WallpaperTab = 'create' | 'templates' | 'gallery';

export default function WallpaperScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [activeTab, setActiveTab] = useState<WallpaperTab>('create');

  const tabs: { key: WallpaperTab; label: string }[] = [
    { key: 'create', label: t('wallpaper.tab_create') },
    { key: 'templates', label: t('wallpaper.tab_templates') },
    { key: 'gallery', label: t('wallpaper.tab_gallery') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('wallpaper.title')}</Text>
        <View style={styles.headerSpacer} />
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

      <View style={styles.body}>
        {activeTab === 'create' && <WallpaperEditor />}
        {activeTab === 'templates' && <WallpaperTemplates />}
        {activeTab === 'gallery' && <WallpaperGallery />}
      </View>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    headerSpacer: { width: 26 },
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
    tabLabel: { fontSize: 15 },
    tabLabelActive: { color: c.textPrimary, fontWeight: '700' },
    tabLabelInactive: { color: c.textSecondary, fontWeight: '500' },
    body: { flex: 1 },
  });
}
