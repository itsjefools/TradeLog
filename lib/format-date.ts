// 言語ロケールに合わせて日付/時刻を整形する純関数群。
// React コンポーネント内では useI18n() の locale を渡して使う:
//   const { locale } = useI18n();
//   formatDate(d, locale)

type AppLocale = 'ja' | 'en' | 'pt' | 'es';

const LOCALE_MAP: Record<AppLocale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
};

function resolveLocale(locale: string | null | undefined): string {
  if (locale && locale in LOCALE_MAP) {
    return LOCALE_MAP[locale as AppLocale];
  }
  return LOCALE_MAP.ja;
}

/** 「2026年5月18日」「May 18, 2026」のようなフル日付 */
export function formatDate(
  date: Date | string,
  locale: string | null | undefined,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(resolveLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
}

/** 「2026/5/18」のような短縮日付 */
export function formatDateShort(
  date: Date | string,
  locale: string | null | undefined,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(resolveLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
}

/** 「2026年5月18日 14:30」のような日付+時刻 */
export function formatDateTime(
  date: Date | string,
  locale: string | null | undefined,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(resolveLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
  }
}

/** 「14:30」のような時刻のみ (24時間表記) */
export function formatTime(
  date: Date | string,
  locale: string | null | undefined,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(resolveLocale(locale), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

/** DateTimePicker などに渡すロケール文字列を返す */
export function pickerLocale(locale: string | null | undefined): string {
  return resolveLocale(locale);
}
