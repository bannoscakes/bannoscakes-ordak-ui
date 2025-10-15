import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Returns a configured client when envs exist; otherwise a dummy value.
 * Call sites must handle the client possibly being undefined.
 */
export const supabase = (url && anon) ? createClient(url, anon) : undefined;
