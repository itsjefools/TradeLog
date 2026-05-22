import { captureError } from './sentry';

type QueryResult<T> = { data: T | null; error: unknown };

type AuthErrorish = {
  message?: string;
  code?: string;
};

function isAuthError(err: unknown): boolean {
  const e = err as AuthErrorish;
  if (!e) return false;
  if (typeof e.message === 'string' && e.message.includes('JWT')) return true;
  if (e.code === 'PGRST301') return true;
  return false;
}

/**
 * Supabase クエリのリトライラッパー。
 *
 * - 認証エラー (JWT 期限切れ等) はリトライしない
 * - リトライ間隔は線形バックオフ (delayMs * 試行回数)
 * - すべて失敗したら captureError へ通報して最後のエラーを返す
 */
export async function withRetry<T>(
  fn: () => Promise<QueryResult<T>>,
  maxRetries: number = 2,
  delayMs: number = 1000,
): Promise<QueryResult<T>> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (!result.error) return result;

      lastError = result.error;
      if (isAuthError(result.error)) return result;

      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (attempt + 1)),
        );
      }
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (attempt + 1)),
        );
      }
    }
  }

  captureError(lastError, { context: 'withRetry exhausted' });
  return { data: null, error: lastError };
}

/**
 * AbortController を使ったタイムアウト付き fetch。
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
