import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export default function TabLayout() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
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
        name="create-post-button"
        options={{
          title: '',
          tabBarButton: () => (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pressable
                onPress={() => router.push('/create-post')}
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: c.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -16,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  shadowColor: c.accent,
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                })}
              >
                <Ionicons name="add" size={28} color={c.onAccent} />
              </Pressable>
            </View>
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
