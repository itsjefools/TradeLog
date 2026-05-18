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

function detectInitial(): LocaleCode {
  const sys = Localization.getLocales()[0]?.languageCode ?? 'ja';
  if (sys === 'ja' || sys === 'en' || sys === 'pt' || sys === 'es') {
    return sys;
  }
  return 'ja';
}

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectInitial());
  const [hydrated, setHydrated] = useState(false);
  const { profile, updateProfile } = useProfile();

  // 起動時: AsyncStorage から復元(最優先のソース)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (
        stored === 'ja' ||
        stored === 'en' ||
        stored === 'pt' ||
        stored === 'es'
      ) {
        setLocaleState(stored);
      }
      setHydrated(true);
    });
  }, []);

  // profile.language は AsyncStorage に値がない初回のみ反映
  // 一度ユーザーがアプリ内で変更したら AsyncStorage が source of truth
  useEffect(() => {
    if (!hydrated) return;
    const lang = profile?.language;
    if (lang !== 'ja' && lang !== 'en' && lang !== 'pt' && lang !== 'es') {
      return;
    }
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
        // ignore
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
