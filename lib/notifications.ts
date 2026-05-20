import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// フォアグラウンドでも通知を表示する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type PushPlatform = 'ios' | 'android' | 'web';

function currentPlatform(): PushPlatform | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return null;
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Social',
    description: 'いいね、コメント、フォロー、リポストなどの通知',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
    lightColor: '#10B981',
  });
  await Notifications.setNotificationChannelAsync('trade', {
    name: 'Trade',
    description: '取引関連の通知',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Expo Push Token を取得し、Android チャンネルもこの時点で初期化する。
 * 実機以外、権限なし、トークン取得失敗時は null を返す。
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch {
    return null;
  }
}

/**
 * トークンを user_push_tokens に upsert。
 * 同じ (user_id, token) があれば updated_at を更新する。
 */
export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  const platform = currentPlatform();
  if (!platform) return;

  const { data: existing, error: selectError } = await supabase
    .from('user_push_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('token', token)
    .maybeSingle();

  if (selectError) return;

  if (existing) {
    await supabase
      .from('user_push_tokens')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('user_push_tokens').insert({
      user_id: userId,
      token,
      platform,
    });
  }
}

/**
 * ログアウト時など、特定端末のトークンを削除する。
 */
export async function removePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await supabase
    .from('user_push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
}

/**
 * アプリアイコンの未読バッジを 0 にする。
 */
export async function resetBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // 一部プラットフォーム/Web では setBadgeCount 非対応
  }
}
