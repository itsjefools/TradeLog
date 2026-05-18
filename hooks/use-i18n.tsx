import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import en from '@/lib/translations/en';
import es from '@/lib/translations/es';
import ja from '@/lib/translations/ja';
import pt from '@/lib/translations/pt';

import { useProfile } from './use-profile';

const STORAGE_KEY = 'tradelog:locale';

export const SUPPORTED_LOCALES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

const i18n = new I18n({ ja, en, pt, es });
i18n.defaultLocale = 'ja';
i18n.enableFallback = true;

function isSupportedLocale(value: unknown): value is LocaleCode {
  return value === 'ja' || value === 'en' || value === 'pt' || value === 'es';
}

// デバイスロケールを安全に取得して、対応している言語コードだけ返す。
function detectDeviceLocale(): LocaleCode | null {
  const code = Localization.getLocales()[0]?.languageCode ?? null;
  return isSupportedLocale(code) ? code : null;
}

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // 初期状態は 'ja' で開始し、AsyncStorage / デバイスロケールを非同期で確認する
  const [locale, setLocaleState] = useState<LocaleCode>('ja');
  const [hydrated, setHydrated] = useState(false);
  const { profile, updateProfile } = useProfile();

  // 起動時のロケール決定
  // 優先順位:
  //   1. AsyncStorage に保存されたユーザー選択 (最優先)
  //   2. デバイスロケール (サポート言語のみ)
  //   3. 'ja' フォールバック
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (isSupportedLocale(stored)) {
          setLocaleState(stored);
          setHydrated(true);
          return;
        }
        const device = detectDeviceLocale();
        if (device) {
          setLocaleState(device);
          setHydrated(true);
          return;
        }
        setLocaleState('ja');
        setHydrated(true);
      } catch {
        setLocaleState('ja');
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // profile.language は AsyncStorage が空の初回起動時のみ反映
  // 一度ユーザーがアプリ内で言語を変えたら AsyncStorage が source of truth
  useEffect(() => {
    if (!hydrated) return;
    const lang = profile?.language;
    if (!isSupportedLocale(lang)) return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) {
        setLocaleState(lang);
        AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
      }
    });
  }, [profile?.language, hydrated]);

  i18n.locale = locale;

  const setLocale = useCallback(
    async (l: LocaleCode) => {
      setLocaleState(l);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, l);
      } catch {
        // ignore - 失敗してもメモリ上の locale は反映済み
      }
      // Supabase 側のプロフィールにも同期(失敗しても UI は反映済み)
      if (profile && profile.language !== l) {
        updateProfile({ language: l }).catch(() => {
          // ignore - AsyncStorage は更新済みなので次回起動時も維持される
        });
      }
    },
    [profile, updateProfile],
  );

  const t = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      i18n.t(key, options as object | undefined),
    // 再レンダリングのために locale 依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
