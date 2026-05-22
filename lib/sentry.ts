// Sentry/エラーレポートの薄いラッパー。
//
// 現状は Sentry SDK 未統合のため console.error にフォールバックする。
// 将来 Sentry / Bugsnag / Datadog 等を入れる際は、ここの実装だけ差し替えれば
// 他のファイル (ErrorBoundary, withRetry, ...) はそのまま動く。

type ErrorContext = Record<string, unknown> | undefined;

/**
 * 例外を捕捉してログに残す。本番では将来クラッシュレポーターへ送信する。
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  if (__DEV__) {
    // 開発時はスタックトレースを必ず出す
    // eslint-disable-next-line no-console
    console.error('[captureError]', error, context ?? '');
    return;
  }
  // 本番でも一旦 console に残す (XCode Logs / adb logcat で拾える)
  // eslint-disable-next-line no-console
  console.error('[captureError]', error, context ?? '');
}

/**
 * 任意のメッセージをログに残す。エラー扱いではない情報用。
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
      '[captureMessage]',
      message,
    );
  }
}
