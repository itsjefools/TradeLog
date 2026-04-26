import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { useAuth } from './use-auth';

// 通知の表示動作（フォアグラウンドでも見せる）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return tokenResponse.data;
  } catch {
    return null;
  }
}

/**
 * 起動時に push token を取得して profiles.push_token に保存。
 * 通知タップで関連画面へ遷移する。
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) return;

      const { data: current } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', session.user.id)
        .maybeSingle();

      if (current?.push_token !== token) {
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', session.user.id);
      }
    })();

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | { post_id?: string; actor_id?: string; type?: string }
          | undefined;
        if (!data) return;
        if (data.type === 'follow' && data.actor_id) {
          router.push(`/user/${data.actor_id}`);
        } else if (data.post_id) {
          router.push(`/comments?postId=${data.post_id}`);
        }
      });

    return () => {
      cancelled = true;
      responseListenerRef.current?.remove();
      responseListenerRef.current = null;
    };
  }, [session, router]);
}
