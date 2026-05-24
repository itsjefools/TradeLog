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

// --- 意味ベースのエイリアス (指示_23 の命名規約に対応) ---

/** 軽いタップ (ボタン押下・タブ切替) */
export function lightImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** 中程度のフィードバック (プルリフレッシュ完了など) */
export function mediumImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
    () => undefined,
  );
}

/** 成功通知 (保存・投稿・購入完了) */
export const successNotification = notifySuccess;

/** エラー通知 */
export const errorNotification = notifyError;

/** 選択フィードバック (ピッカー・期間フィルター) */
export const selectionFeedback = tapLight;
