import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as RNThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useAuth } from '@/hooks/use-auth';
import { I18nProvider } from '@/hooks/use-i18n';
import { ProfileProvider } from '@/hooks/use-profile';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { TradesProvider } from '@/hooks/use-trades';

export const unstable_settings = {
  anchor: '(tabs)',
};

function useProtectedRoute(
  session: ReturnType<typeof useAuth>['session'],
  loading: boolean,
) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === 'login';

    if (!session && !inAuthScreen) {
      router.replace('/login');
    } else if (session && inAuthScreen) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const { resolved, colors } = useTheme();
  const { session, loading } = useAuth();

  useProtectedRoute(session, loading);
  usePushNotifications();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <RNThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      <ProfileProvider>
        <I18nProvider>
        <TradesProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile-edit"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="comments"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="notifications"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="trade-history"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="trade-edit"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="premium"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="glossary"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="messages"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="bookmarks"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="dm/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="search"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="ranking"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="user/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
        </TradesProvider>
        </I18nProvider>
      </ProfileProvider>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    </RNThemeProvider>
  );
}
