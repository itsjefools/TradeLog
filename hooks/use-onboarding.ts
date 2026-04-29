import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tradelog:onboarding_completed';

export function useOnboarding() {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setCompleted(v === '1'))
      .catch(() => setCompleted(false));
  }, []);

  const markCompleted = useCallback(async () => {
    setCompleted(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  return { completed, markCompleted };
}
