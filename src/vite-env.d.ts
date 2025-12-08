/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DEV_PORT?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_SUPERVISOR_DEMO_LOGIN?: string
  readonly VITE_APP_URL?: string
  readonly VITE_SUPABASE_PERSIST_SESSION?: string
  readonly VITE_SUPABASE_STORAGE_KEY?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_QUEUE_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

