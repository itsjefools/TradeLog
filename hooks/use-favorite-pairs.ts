import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tradelog:favorite_pairs';

export function useFavoritePairs() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setFavorites(parsed.filter((v): v is string => typeof v === 'string'));
            }
          } catch {
            // 壊れたデータは無視
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const toggleFavorite = useCallback((pair: string) => {
    setFavorites((prev) => {
      const next = prev.includes(pair)
        ? prev.filter((p) => p !== pair)
        : [...prev, pair];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        // 書き込み失敗は黙って無視（次回起動時は再読込されるだけ）
      });
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (pair: string) => favorites.includes(pair),
    [favorites],
  );

  return { favorites, isFavorite, toggleFavorite, loaded };
}
