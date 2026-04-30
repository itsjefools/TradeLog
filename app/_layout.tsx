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
import { BlocksProvider } from '@/hooks/use-blocks';
import { I18nProvider } from '@/hooks/use-i18n';
import { useOnboarding } from '@/hooks/use-onboarding';
import { ProfileProvider } from '@/hooks/use-profile';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { RevenueCatProvider } from '@/hooks/use-revenue-cat';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { TradesProvider } from '@/hooks/use-trades';

export const unstable_settings = {
  anchor: '(tabs)',
};

function useProtectedRoute(
  session: ReturnType<typeof useAuth>['session'],
  loading: boolean,
  onboardingCompleted: boolean | null,
) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || onboardingCompleted === null) return;

    const first = segments[0];
    const inAuthScreen = first === 'login';
    const inOnboarding = first === 'onboarding';

    // 未オンボーディング & 未ログインなら強制的にオンボーディングへ
    if (!onboardingCompleted && !session && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (!session && !inAuthScreen && !inOnboarding) {
      router.replace('/login');
    } else if (session && (inAuthScreen || inOnboarding)) {
      router.replace('/');
    }
  }, [session, loading, segments, router, onboardingCompleted]);
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
  const { completed: onboardingCompleted } = useOnboarding();

  useProtectedRoute(session, loading, onboardingCompleted);
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
        <BlocksProvider>
        <RevenueCatProvider>
          <Stack screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile-edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="comments"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="trade-history"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="trade-edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="premium"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="glossary"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="messages"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="bookmarks"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="risk-calculator"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="economic-calendar"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="goal-edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="language-edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="blocked-users"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="terms"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="privacy"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="account-delete"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="follow-list"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="create-post"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="dm/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="search"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ranking"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="user/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="modal"
              options={{ title: 'Modal' }}
            />
          </Stack>
        </RevenueCatProvider>
        </BlocksProvider>
        </TradesProvider>
        </I18nProvider>
      </ProfileProvider>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    </RNThemeProvider>
  );
}
