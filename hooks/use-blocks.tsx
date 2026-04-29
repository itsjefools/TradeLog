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

type BlocksContextValue = {
  blockedIds: string[];
  isBlocked: (userId: string) => boolean;
  block: (userId: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const BlocksContext = createContext<BlocksContextValue | null>(null);

export function BlocksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBlockedIds([]);
      return;
    }
    const { data } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);
    setBlockedIds((data ?? []).map((r: { blocked_id: string }) => r.blocked_id));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const blockedSet = useMemo(() => new Set(blockedIds), [blockedIds]);

  const isBlocked = useCallback(
    (id: string) => blockedSet.has(id),
    [blockedSet],
  );

  const block = useCallback(
    async (target: string) => {
      if (!userId || target === userId) return;
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: userId, blocked_id: target });
      if (error) throw new Error(error.message);
      setBlockedIds((prev) =>
        prev.includes(target) ? prev : [...prev, target],
      );
    },
    [userId],
  );

  const unblock = useCallback(
    async (target: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', target);
      if (error) throw new Error(error.message);
      setBlockedIds((prev) => prev.filter((id) => id !== target));
    },
    [userId],
  );

  const value = useMemo(
    () => ({ blockedIds, isBlocked, block, unblock, refresh }),
    [blockedIds, isBlocked, block, unblock, refresh],
  );

  return (
    <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>
  );
}

export function useBlocks() {
  const ctx = useContext(BlocksContext);
  if (!ctx) throw new Error('useBlocks must be used inside BlocksProvider');
  return ctx;
}
