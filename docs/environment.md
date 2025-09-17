# Environment

How we configure Ordak across **dev / staging / production**. Keep secrets out of the client; only publish variables that begin with `VITE_`.

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

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` (e.g., `http://localhost:5173`)
- `VITE_SENTRY_DSN` *(optional)*
- `VITE_POSTHOG_KEY` *(optional)*

**Local example** (`.env.local`):
```dotenv
# --- Vite app (frontend) ---
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:5173

# Optional analytics/monitoring
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
Edge Functions (server-only) variables
Do not expose these to the client.

SUPABASE_SERVICE_ROLE_KEY

SHOPIFY_BANNOS_TOKEN

SHOPIFY_FLOURLANE_TOKEN

SHOPIFY_WEBHOOK_SECRET

SLACK_WEBHOOK_URL

(optional) LOG_LEVEL=info|debug

Local example (supabase/functions/.env or via supabase secrets set):

dotenv
Copy code
# --- Edge Functions (server-only) ---
SUPABASE_SERVICE_ROLE_KEY=
SHOPIFY_BANNOS_TOKEN=
SHOPIFY_FLOURLANE_TOKEN=
SHOPIFY_WEBHOOK_SECRET=
SLACK_WEBHOOK_URL=
LOG_LEVEL=info
Deploying secrets to Supabase (recommended):

bash
Copy code
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SHOPIFY_BANNOS_TOKEN=... SHOPIFY_FLOURLANE_TOKEN=... SHOPIFY_WEBHOOK_SECRET=... SLACK_WEBHOOK_URL=...
Store mapping (informational)
Bannos: uses SHOPIFY_BANNOS_TOKEN, domain like bannos…

Flourlane: uses SHOPIFY_FLOURLANE_TOKEN, domain like flourlane…

Edge routes pick the correct store by shop domain in the webhook payload.

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
Rotate service role, Shopify tokens, webhook secret, and Slack webhook every 90 days or on staff change.

After rotation:

Update secrets in Supabase and your deploy provider.

Redeploy Edge Functions and frontend.

Replay any failed Shopify webhooks (Shopify Admin).

Keep a secure notes record (who rotated, when, where updated).

Gotchas
Vite only exposes envs with the VITE_ prefix.

Don’t reference service_role keys in the browser.

If webhook validation fails: re-check SHOPIFY_WEBHOOK_SECRET and shop domain mapping.

If the app can’t read from DB locally: verify VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY and that RLS allows select.

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