import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import { clearSupabaseAuthStorage } from './supabase-storage';

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
  if (!persistSession) {
    clearSupabaseAuthStorage();
  }
  const storage =
    typeof window !== 'undefined'
      ? persistSession
        ? window.localStorage
        : undefined
      : undefined;
  const authOptions: Parameters<typeof createClient>[2]['auth'] = {
    persistSession,                                 // ✅ keep session on reload
    storage,                                        // ✅ where to keep it
    storageKey: config.supabaseStorageKey,         // ✅ stable key
    autoRefreshToken: true,
    detectSessionInUrl: true,
  };

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
