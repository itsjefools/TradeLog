import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cilevqeambcqlpywkqfn.supabase.co';
const supabaseAnonKey = 'sb_publishable_JSlWOWkQNeKhNMeQtgX26w_hrin9iVs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
