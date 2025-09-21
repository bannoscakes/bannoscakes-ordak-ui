/**
 * Central, read-only app config.
 * All VITE_* env reads live here. Import { config } from "src/lib/config".
 * Do not read import.meta.env directly in feature files.
 */
export type AppConfig = Readonly<{
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl?: string;
  useMocks: boolean;
}>;

export const config: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appUrl: import.meta.env.VITE_APP_URL as string | undefined,
  // Default to true so mocks work out of the box in local dev
  useMocks: String(import.meta.env.VITE_USE_MOCKS ?? "true").toLowerCase() === "true",
} as const;