import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * 軽い触覚フィードバック (タブ切替・チップ選択など)
 */
export function tapLight() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => undefined);
}

/**
 * いいね・ブックマーク等の小さな確定アクション
 */
export function tapSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/**
 * 投稿・購入完了など意義のある成功
 */
export function notifySuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}

/**
 * エラー発生時
 */
export function notifyError() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => undefined,
  );
}

/**
 * 警告 (Free 制限など)
 */
export function notifyWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => undefined,
  );
}
