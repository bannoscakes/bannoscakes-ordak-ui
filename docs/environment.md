# Environment

How we configure Ordak across **dev / staging / production**. Keep secrets out of the client; only publish variables that begin with `VITE_`.

## Quick Start

**For new developers:** Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and anon key
npm run dev
```

See `.env.example` at the repo root for a complete list of all environment variables with descriptions and default values.

---

## Matrix

| Area | Dev (local) | Staging | Production |
|---|---|---|---|
| Frontend (Vite/React) | `.env.local` | Provider project env (e.g., Vercel) | Provider project env |
| Edge Functions (Supabase) | local `.env` or `supabase secrets set` | Supabase **secrets** | Supabase **secrets** |
| DB | Supabase **dev** project | Supabase **staging** | Supabase **prod** |
| Keys rotation | as needed | every 90 days | every 90 days or on staff change |

> **Never commit secrets.** Client uses **anon** key only. Edge Functions use **service role**.

---

## Frontend (Vite) variables

> Exposed to the browser. Must start with `VITE_`.

### Required Variables
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_APP_URL` - Application URL (e.g., `http://localhost:3000`)

### Optional Variables
- `VITE_DEV_PORT` - Development server port (default: 3000)
- `VITE_SUPABASE_PERSIST_SESSION` - Enable session persistence (default: true)
- `VITE_SUPABASE_STORAGE_KEY` - localStorage key for auth (default: ordak-auth-token)
- `VITE_USE_MOCKS` - Enable mock data for offline dev (default: false)
- `VITE_SUPERVISOR_DEMO_LOGIN` - Demo mode flag (should be empty/false)
- `VITE_SENTRY_DSN` - Sentry error monitoring DSN
- `VITE_ENABLE_SHOPIFY_SYNC` - Enable Shopify integration (default: false)

**Local example** (`.env.local`):
```dotenv
# --- Required ---
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:3000

# --- Optional (with defaults) ---
VITE_DEV_PORT=3000
VITE_SUPABASE_PERSIST_SESSION=true
VITE_USE_MOCKS=false

# --- Production Only ---
VITE_SENTRY_DSN=
Edge Functions (server-only) variables
Do not expose these to the client.

SUPABASE_SERVICE_ROLE_KEY

SHOPIFY_BANNOS_TOKEN

SHOPIFY_FLOURLANE_TOKEN

SLACK_WEBHOOK_URL

(optional) LOG_LEVEL=info|debug

Local example (supabase/functions/.env or via supabase secrets set):

dotenv
Copy code
# --- Edge Functions (server-only) ---
SUPABASE_SERVICE_ROLE_KEY=
SHOPIFY_BANNOS_TOKEN=
SHOPIFY_FLOURLANE_TOKEN=
SLACK_WEBHOOK_URL=
LOG_LEVEL=info
Deploying secrets to Supabase (recommended):

bash
Copy code
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SHOPIFY_BANNOS_TOKEN=... SHOPIFY_FLOURLANE_TOKEN=... SLACK_WEBHOOK_URL=...
Store mapping (informational)
Bannos: uses SHOPIFY_BANNOS_TOKEN

Flourlane: uses SHOPIFY_FLOURLANE_TOKEN

Each store has its own dedicated webhook Edge Function.

Quick verification
Frontend (in app code):

ts
Copy code
console.log(import.meta.env.VITE_SUPABASE_URL) // should print your URL
Edge Functions:

ts
Copy code
// Deno / Supabase Edge
console.log(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
Healthcheck ideas

Add /edge/health that returns { up: true, db_ms: <ping> }.

On boot, log which store tokens are present (never log their values).

Rotations & hygiene
Rotate service role, Shopify tokens, and Slack webhook every 90 days or on staff change.

After rotation:

Update secrets in Supabase and your deploy provider.

Redeploy Edge Functions and frontend.

Replay any failed Shopify webhooks (Shopify Admin).

Keep a secure notes record (who rotated, when, where updated).

Gotchas
Vite only exposes envs with the VITE_ prefix.

Don't reference service_role keys in the browser.

If webhooks fail: check Supabase Edge Function logs and verify SUPABASE_SERVICE_ROLE_KEY is set.

If the app can't read from DB locally: verify VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY and that RLS allows select.

Checklist (per environment)
Dev

.env.local present with VITE_*

Edge .env or supabase secrets set

npm run dev works; /edge/health is up

Staging

Project env has VITE_*

Supabase secrets set for Edge

Migrations applied; smoke test order → print → scan flows

Production

Secrets present & recently rotated

Monitoring keys set (Sentry/PostHog)

Health checks green; backups (PITR) enabled