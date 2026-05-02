import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'tradelog:onboarding_completed';

type OnboardingContextValue = {
  /** null = まだ AsyncStorage を読んでいない（ローディング中）*/
  completed: boolean | null;
  markCompleted: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled) setCompleted(v === '1');
      })
      .catch(() => {
        if (!cancelled) setCompleted(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCompleted = useCallback(async () => {
    // AsyncStorage に書き込む前に state を更新して、即座に
    // useProtectedRoute の判定を「完了済み」にする。
    setCompleted(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // 失敗しても state は true のまま (再起動時に再度読み直される)
    }
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ completed, markCompleted }),
    [completed, markCompleted],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside OnboardingProvider');
  }
  return ctx;
}
