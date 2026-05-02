import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

import { useAuth } from './use-auth';

type UnreadCountsContextValue = {
  notifications: number;
  refresh: () => Promise<void>;
};

const UnreadCountsContext = createContext<UnreadCountsContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function UnreadCountsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [notifications, setNotifications] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications(0);
      return;
    }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, refresh]);

  const value = useMemo(
    () => ({ notifications, refresh }),
    [notifications, refresh],
  );

  return (
    <UnreadCountsContext.Provider value={value}>
      {children}
    </UnreadCountsContext.Provider>
  );
}

export function useUnreadCounts() {
  const ctx = useContext(UnreadCountsContext);
  if (!ctx)
    throw new Error('useUnreadCounts must be used inside UnreadCountsProvider');
  return ctx;
}
