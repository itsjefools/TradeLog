/**
 * 相対時刻表示。SNS で「5分前」「2時間前」「昨日」「先週」等を返す。
 * 7日以上前は絶対日付（M/D もしくは YYYY/M/D）にフォールバック。
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatRelativeTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = now - date.getTime();

  // 未来日付はそのまま絶対表示
  if (diff < 0) return formatAbsoluteShort(date);

  if (diff < 30 * 1000) return 'たった今';
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return `${m}分前`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h}時間前`;
  }
  if (diff < 2 * DAY) {
    return `昨日 ${formatTime(date)}`;
  }
  if (diff < 7 * DAY) {
    const d = Math.floor(diff / DAY);
    return `${d}日前`;
  }

  return formatAbsoluteShort(date);
}

/**
 * 投稿カード用に少し短くした相対表現。 "5m" "2h" "1d" "Apr 10" 形式。
 * (英語/数字混在で、海外ユーザーにも伝わりやすい)
 */
export function formatRelativeCompact(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return formatAbsoluteShort(date);
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  if (diff < 365 * DAY)
    return `${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatAbsoluteShort(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (sameYear) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
