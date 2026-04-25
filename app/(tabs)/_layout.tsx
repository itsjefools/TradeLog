import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ACCENT = '#6366F1';
const BACKGROUND = '#0F172A';
const INACTIVE = '#64748B';
const BORDER = '#1E293B';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: BACKGROUND,
          borderTopColor: BORDER,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'フィード',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '記録',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: '分析',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
