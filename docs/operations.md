# Operations & Production Docs (Final)
**Version:** 1.0.0  
**Last Updated:** 2025-01-16  
**Status:** Production

Authoritative reference for configuration, deployment, testing, error handling, APIs, backups, performance targets, and onboarding.  
This document is essential for production readiness and developer collaboration.

---

## Environment Variables

### Development (`.env.local`)
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
VITE_APP_URL=http://localhost:5173

shell
Copy code

### Production (provider env, e.g., Vercel)
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
VITE_APP_URL=https://ordak.example.com
VITE_SENTRY_DSN=[YOUR_SENTRY_DSN]
VITE_POSTHOG_KEY=[YOUR_POSTHOG_KEY]

shell
Copy code

### Edge Functions (Supabase secrets or local `.env`)
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE]
SHOPIFY_BANNOS_TOKEN=[ADMIN_API_TOKEN]
SHOPIFY_FLOURLANE_TOKEN=[ADMIN_API_TOKEN]
SHOPIFY_WEBHOOK_SECRET=[WEBHOOK_HMAC_SECRET]
SLACK_WEBHOOK_URL=[SLACK_WEBHOOK]

markdown
Copy code

**Notes**
- Frontend **only** uses the anon key.  
- **Service role** must never ship in the client.  
- Rotate keys if exposed or on staff change.

---

## Deployment Guide

### Prerequisites
- Node 18+  
- Supabase projects for dev/staging/prod  
- Hosting for frontend (Vercel/Netlify/etc.)  
- Supabase Edge Functions (webhooks/worker)

### Steps
1. **Run migrations** on the target environment.  
2. **Set environment variables** as above.  
3. **Build frontend** and verify locally.  
4. **Deploy Edge Functions** with secrets set.  
5. **Configure Shopify webhooks** (orders/create, orders/cancel).  
6. **Verify health checks** and **smoke tests**.

### Post-Deploy Verification
- Queue/dashboard loads; **p95** latency acceptable.  
- Webhook end-to-end **< 500ms** p95.  
- Inventory sync success rate **> 99%**.  
- No **service role** key in frontend bundle.  
- No red errors in browser console.

---

## Emergency Rollback
1. **Revert** to previous deploy: `git revert HEAD` (or checkout the last tag) and redeploy the app.  
2. **Restore previous Edge Function** version (Supabase Functions → History → Roll back).  
3. If data is impacted, **point env** to the previous **DB backup/PITR** snapshot.  
4. **Clear CDN cache** (Vercel/Netlify) to flush old assets.  
5. **Notify** the team via Slack with status and next steps.

---

## Monitoring Dashboards
- Supabase Dashboard: `<add-link>`  
- Vercel Analytics: `<add-link>`  
- Sentry Errors: `<add-link>`  
- PostHog Analytics: `<add-link>`

---

## Shopify Webhook Setup
- **Event**: `orders/create` (and `orders/cancel`)  
- **URL**: `https://[your-domain]/api/v1/webhooks/shopify`  
- **Format**: JSON  
- **API Version**: `2024-01`  
- **Verify**: HMAC with `SHOPIFY_WEBHOOK_SECRET` on every request

---

## Testing Strategy

### Unit
- RPC logic (roles, idempotency, stage validation)  
- UI components in isolation  
- Priority/due-date rules

### Integration
- DB transactions for orders/inventory flows  
- Shopify webhook **HMAC verification** + **dedupe**  
- `work_queue` enqueue and retry backoff

### End-to-End
- Order lifecycle: **Filling → … → Complete**  
- Manual order create/edit  
- Shifts/breaks (if enabled)  
- Error handling/recovery paths

### CI Gates
- Run **unit + integration** on PRs  
- **Block merges** on failing migrations  
- Collect coverage for RPCs + UI core logic

---

## Error Codes & Handling (examples)

**Application Errors**
- ORD001 — Order not found  
- ORD002 — Invalid stage transition  
- INV001 — Insufficient stock  
- INV002 — Component not found  
- AUTH001 — Unauthorized access  
- SYNC001 — Shopify sync failed

**Recovery**
- ORD001: verify order id/store; search by Shopify IDs; re-index if needed  
- ORD002: confirm current stage; check trigger/RPC idempotency; fix client call  
- INV001: set `inventory_blocked=true`, notify Supervisor, enqueue OOS update; restock then clear flag  
- INV002: fix BOM/component mapping; re-run deduction  
- AUTH001: re-authenticate; confirm roles in `staff_shared`; audit RPC checks  
- SYNC001: inspect `work_queue`; `retry_failed_sync`; check Shopify Admin API status

**Logging Rules**
- No PII in logs  
- Include correlation id, store, order number  
- Record duration and outcome for each RPC

---

## API Reference (HTTP)

### `POST /api/v1/orders`
- **Purpose**: server-to-server create  
- **Request**: `{ store, customer_name, products[], due_date }`  
- **Response**: `{ order_id, status: 'created' | 'skipped', message }`  
- **Notes**: token/HMAC required; **idempotent** on Shopify id/GID

### `GET /api/health`
- **Purpose**: health check  
- **Response**: `{ ok: true, version: "x.y.z" }`

### `POST /api/v1/webhooks/shopify`
- **Purpose**: Shopify webhook receiver  
- **Notes**: verify HMAC; **dedupe** on order id/GID

### `GET /api/v1/inventory`
- **Purpose**: read component/product inventory  
- **Params**: `sku` or product id  
- **Response**: `{ on_hand, reserved, buffer, ats }`

### `POST /api/v1/sync`
- **Purpose**: trigger inventory sync job  
- **Notes**: Admin token required; dedupe enforced

---

## Backup & Recovery (summary)

- **Backups**: daily; **PITR 7 days** (see `docs/backup-recovery.md`)  
- **RTO**: ≤ 2–4h • **RPO**: ≤ 1–24h (env-dependent)

**Restore (high-level)**
1. Confirm incident and last good time  
2. Pause writers (webhooks/worker)  
3. Restore to a **new** project at PITR timestamp  
4. Point **staging** to restored DB → smoke + RLS sanity  
5. Cut over prod env vars; rotate secrets; redeploy  
6. Reconcile deltas; replay Shopify deliveries

---

## Performance SLAs (summary)
- Queue p95 **< 200ms**  
- Order creation p95 **< 500ms**  
- Inventory push p95 **< 2s**  
- Availability **99.9%** / month  
- Alert on error rate > 1% or queue depth spike  
(Full details: `docs/performance-slas.md`)

---

## Onboarding (summary)

**New Dev Setup**
1. Clone repo & install deps  
2. Copy `.env.example` → `.env.local` and fill  
3. Run migrations (dev DB)  
4. Seed minimal test data  
5. Start dev server  
6. Run tests

**Must-Know**
- No direct table writes from frontend  
- All mutations via **SECURITY DEFINER** RPCs  
- Work on feature branches; keep `main` clean  
- Document changes (Dev Change Report)

**Commands**
npm install
npm run dev
npm test
npm run build

yaml
Copy code

---

## Day-to-day Ops (links)
- Webhooks & workers: sections above  
- Incident runbook: `docs/runbook.md`  
- Backups & recovery: `docs/backup-recovery.md`