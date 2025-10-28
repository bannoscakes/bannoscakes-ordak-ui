import { config } from './config';

function deriveLegacySupabaseStorageKey(): string | null {
  const supabaseUrl = config.supabaseUrl;
  if (!supabaseUrl) {
    return null;
  }

  try {
    const projectRef = new URL(supabaseUrl).host.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch (error) {
    console.warn('Unable to derive legacy Supabase storage key:', error);
    return null;
  }
}

export function getSupabaseStorageKeys(): string[] {
  return [config.supabaseStorageKey, deriveLegacySupabaseStorageKey()].filter(
    (key): key is string => Boolean(key)
  );
}

export function clearSupabaseAuthStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKeys = new Set(getSupabaseStorageKeys());

  [window.localStorage, window.sessionStorage].forEach(storage => {
    storageKeys.forEach(key => storage.removeItem(key));
  });
}
