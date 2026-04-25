import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import { Trade } from '@/lib/types';

import { useAuth } from './use-auth';

type TradesContextValue = {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => Promise<void>;
};

const TradesContext = createContext<TradesContextValue | null>(null);

export function TradesProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setTrades([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .order('traded_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTrades((data ?? []) as Trade[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addTrade = useCallback((trade: Trade) => {
    setTrades((prev) => {
      if (prev.some((t) => t.id === trade.id)) return prev;
      return [trade, ...prev];
    });
  }, []);

  const deleteTrade = useCallback(
    async (id: string) => {
      const previous = trades;
      setTrades((prev) => prev.filter((t) => t.id !== id));

      const { error: deleteError } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setTrades(previous);
        throw new Error(deleteError.message);
      }
    },
    [trades],
  );

  return (
    <TradesContext.Provider
      value={{ trades, loading, error, refresh, addTrade, deleteTrade }}
    >
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) throw new Error('useTrades must be used inside TradesProvider');
  return ctx;
}
