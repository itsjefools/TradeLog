import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { setPipUnit } from '@/lib/format-pips';
import { supabase } from '@/lib/supabase';
import { PROFILE_COLUMNS, Profile } from '@/lib/types';

import { useAuth } from './use-auth';

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', session.user.id)
      .maybeSingle();
    if (fetchError) {
      setError(fetchError.message);
    } else {
      const p = (data ?? null) as Profile | null;
      setProfile(p);
      setPipUnit(p?.pip_unit ?? 'pips');
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!session) throw new Error('未ログインです');
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', session.user.id)
        .select()
        .single();
      if (updateError) {
        throw new Error(updateError.message);
      }
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setPipUnit(p.pip_unit ?? 'pips');
      }
    },
    [session],
  );

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, refresh, updateProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
