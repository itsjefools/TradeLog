import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  registerForPushNotifications,
  resetBadgeCount,
  savePushToken,
} from '@/lib/notifications';

import { useAuth } from './use-auth';

/**
 * 起動時に push token を取得して user_push_tokens に保存。
 * 通知タップで関連画面へ遷移、アプリがフォアグラウンドに戻ったらバッジをリセット。
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
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;
      await savePushToken(session.user.id, token);
    })();

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | { post_id?: string; actor_id?: string; type?: string }
          | undefined;
        resetBadgeCount();
        if (!data) {
          router.push('/notifications');
          return;
        }
        if (data.type === 'follow' && data.actor_id) {
          router.push(`/user/${data.actor_id}`);
        } else if (data.post_id) {
          router.push(`/comments?postId=${data.post_id}`);
        } else {
          router.push('/notifications');
        }
      });

    // フォアグラウンド復帰時にバッジをリセット
    resetBadgeCount();
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') resetBadgeCount();
    });

    return () => {
      cancelled = true;
      responseListenerRef.current?.remove();
      responseListenerRef.current = null;
      appStateSub.remove();
    };
  }, [session, router]);
}
