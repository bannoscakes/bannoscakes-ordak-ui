import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Do not initialize at import time; throw only when someone tries to use the client
    throw new Error('Supabase env not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  const persistSession = config.persistSupabaseSession;
  const authOptions: Parameters<typeof createClient>[2]['auth'] = {
    persistSession,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: config.supabaseStorageKey,
  };

  if (persistSession && typeof window !== 'undefined') {
    authOptions.storage = window.localStorage;
  }

  _client = createClient(url, anon, {
    auth: authOptions,
  });
  return _client;
}

// Back-compat: export an instance-like object that lazily initializes on first property access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getSupabase();
    // @ts-ignore
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  }
}) as SupabaseClient;

export default supabase;
