/**
 * Central, read-only app config.
 * All VITE_* env reads live here. Import { config } from "src/lib/config".
 * Do not read import.meta.env directly in feature files.
 */
export type AppConfig = Readonly<{
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  persistSupabaseSession: boolean;
  supabaseStorageKey: string;
}>;

export const config: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  persistSupabaseSession:
    String(import.meta.env.VITE_SUPABASE_PERSIST_SESSION ?? "true").toLowerCase() === "true",
  supabaseStorageKey: (import.meta.env.VITE_SUPABASE_STORAGE_KEY as string | undefined) ?? "ordak-auth-token",
} as const;
