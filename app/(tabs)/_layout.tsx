import { Ionicons } from '@expo/vector-icons';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { tapSuccess } from '@/lib/haptics';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const c = useThemeColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { notifications } = useUnreadCounts();

  const meta: Record<
    string,
    { label: string; icon: (color: string) => React.ReactNode; badge?: number }
  > = {
    index: {
      label: t('tabs.feed'),
      icon: (color) => <IconSymbol size={26} name="house.fill" color={color} />,
      badge: notifications,
    },
    record: {
      label: t('tabs.record'),
      icon: (color) => (
        <Ionicons size={24} name="create-outline" color={color} />
      ),
    },
    analytics: {
      label: t('tabs.analytics'),
      icon: (color) => (
        <IconSymbol size={26} name="chart.bar.fill" color={color} />
      ),
    },
    school: {
      label: t('tabs.school'),
      icon: (color) => (
        <Ionicons size={24} name="school-outline" color={color} />
      ),
    },
    profile: {
      label: t('tabs.profile'),
      icon: (color) => <IconSymbol size={26} name="person.fill" color={color} />,
    },
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.background,
          borderTopColor: c.border,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const m = meta[route.name];
        if (!m) return null;
        const color = focused ? c.accent : c.textSecondary;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            tapSuccess();
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable key={route.key} style={styles.item} onPress={onPress}>
            <View>
              {m.icon(color)}
              {!!m.badge && m.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: c.loss }]} />
              )}
            </View>
            <Text style={[styles.label, { color }]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ swipeEnabled: true, lazy: false }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="record" />
      <MaterialTopTabs.Screen name="analytics" />
      <MaterialTopTabs.Screen name="school" />
      <MaterialTopTabs.Screen name="profile" options={{ swipeEnabled: false }} />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  label: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    minWidth: 8,
    height: 8,
    borderRadius: 4,
  },
});
