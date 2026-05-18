import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export default function TabLayout() {
  const c = useThemeColors();
  const { t } = useI18n();
  const inactive = c.textSecondary;
  const { notifications } = useUnreadCounts();
  const badge = notifications > 0 ? notifications : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: inactive,
        headerShown: false,
        tabBarButton: HapticTab,
        animation: 'none',
        lazy: false,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
        },
        tabBarBadgeStyle: {
          backgroundColor: c.loss,
          fontSize: 10,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          tabBarBadge: badge,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: t('tabs.record'),
          tabBarIcon: ({ color }) => (
            <Ionicons size={26} name="create-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tabs.analytics'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
