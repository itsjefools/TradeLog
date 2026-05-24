import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// 毎日のリマインド通知(ローカル通知)。サーバー不要。
// 通知文言は呼び出し側で t() した値を引数で受け取る。

const ENABLED_KEY = 'reminder_enabled';
const REMINDER_HOUR = 21;
const REMINDER_MINUTE = 0;

// 他のスケジュール済み通知と区別するための識別子
const REMINDER_IDENTIFIER = 'daily-record-reminder';

/**
 * 毎日のリマインド通知を有効化する。
 * 通知権限を要求し、許可されたら毎日 21:00 に繰り返し通知をスケジュールする。
 * 権限が拒否された場合は false を返し、フラグは立てない。
 */
export async function enableDailyReminder(
  title: string,
  body: string,
): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return false;
    }

    // 二重登録を避けるため既存の同一通知をいったん解除する
    await Notifications.cancelScheduledNotificationAsync(
      REMINDER_IDENTIFIER,
    ).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(ENABLED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

/**
 * 毎日のリマインド通知を無効化する。
 * スケジュール済みの通知をキャンセルし、フラグを false にする。
 */
export async function disableDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      REMINDER_IDENTIFIER,
    ).catch(() => {});
  } finally {
    await AsyncStorage.setItem(ENABLED_KEY, 'false').catch(() => {});
  }
}

/**
 * リマインド通知が有効かどうかを返す。
 */
export async function isDailyReminderEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}
