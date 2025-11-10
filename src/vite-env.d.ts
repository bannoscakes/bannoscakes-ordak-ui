/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL?: string
  readonly VITE_SHOPIFY_STORE?: string
  readonly VITE_ENV?: string
  readonly VITE_ENABLE_ERROR_MONITORING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

