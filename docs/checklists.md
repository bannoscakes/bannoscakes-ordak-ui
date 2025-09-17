# Checklists (Final)
**Version:** 1.0.0  
**Last Updated:** 2025-01-16  
**Status:** Production

Comprehensive checklists for development, testing, deployment, security, and operations.  
Each section is actionable and auditable.

---

## Import & Compatibility (UI)
- `npm i`, `npm run dev` OK; **no red console errors**
- Tailwind v4 **configless**: `@import "tailwindcss";` (no PostCSS blocks, no `@plugin` in CSS)
- `tailwind.config.ts` minimal; plugins via JS (e.g., `tailwindcss-animate`)
- `src/main.tsx` imports `./styles/globals.css` and wraps `<App/>` in `React.StrictMode`
- Path alias `@` → `src` wired
- Supabase client uses **anon key only**
- **No service role** key bundled in client
- Env vars for frontend are **prefixed `VITE_`**
- TypeScript **strict** enabled
- Critical routes/components have **error boundaries**

---

## Dev Change Report (Template)
- Summary (1–3 lines)
- Files touched (paths)
- SQL migrations added (name + up/down summary) if any
- RPCs changed (signature + role guards)
- RLS changes
- Evidence of smoke tests (pass/fail)
- Rollback steps
- Performance impact (queries added, indexes needed)
- Breaking changes flagged
- Migration tested up and down
- Documentation updated
- Unit tests added/modified

---

## Tailwind v4 Reset (if overlays/polish issues persist)
- No `postcss.config.*` present
- No PostCSS blocks in Vite config or `package.json`
- No `@tailwind base|components|utilities` in CSS
- `globals.css` uses `@import "tailwindcss"`
- Clean reinstall + restart dev: `rm -rf node_modules .vite dist && npm i && npm run dev`
- ⚠️ If staying on v4, lock exact version; have v3 fallback plan documented

---

## Preview Runner Fix (wrong tool picked)
- Delete `bun.lockb`
- Add `"packageManager": "npm@10"` (or your version) to `package.json`
- Keep `package-lock.json`
- `package.json` has scripts for `dev`, `build`, `preview`, `typecheck`

---

## ✅ Release Checklist (dev → staging → prod)

**Before merge**
- [ ] Tests pass (unit + integration)
- [ ] Migrations apply cleanly (`npx supabase migration up`) on a fresh DB
- [ ] No direct table writes in client (RPC-only)
- [ ] `.env` differences reviewed (no secrets in client; `VITE_*` only)

**Staging deploy**
- [ ] Deploy Edge Functions (webhooks/worker)
- [ ] Apply DB migrations
- [ ] Deploy frontend
- [ ] Smoke: ingest test order → **print barcode** → **complete Filling** → **start+complete Packing**
- [ ] Worker backlog healthy (`pending < 500`, oldest < 15m)

**Production deploy**
- [ ] Backup/PITR window confirmed (7 days)
- [ ] Apply DB migrations
- [ ] Deploy Edge + frontend
- [ ] Monitor Sentry/Slack for 30–60 min
- [ ] Tag release & update CHANGELOG

---

## 📦 Shopify Webhook Ingest Checklist (orders/create)
Goal: match **kitchen docket** extraction exactly with safe idempotency.

**Verify secrets & mapping**
- [ ] `SHOPIFY_WEBHOOK_SECRET` per store
- [ ] `SHOPIFY_BANNOS_TOKEN` / `SHOPIFY_FLOURLANE_TOKEN`
- [ ] Route picks store from **shop domain**

**Idempotency**
- [ ] Deduplicate by **GraphQL GID** or numeric id
- [ ] Duplicate → `200 OK` (no-op) + log dedupe

**Field extraction**
- [ ] Human `id`: `bannos-<order_number>` / `flourlane-<order_number>` (fallback to id)
- [ ] Customer, product title, currency, totals
- [ ] **Flavour(s)/notes** from **line item properties** (case-insensitive):
  - Skip keys containing `_origin`, `_raw`, `gwp`, `_LocalDeliveryID`, or starting with `_`
  - Accept names containing “gelato flavour(s)” → keep **value** only
- [ ] `stage='Filling'`; derive `priority` from **due_date**
- [ ] Save **raw payload** to `order_json`

**Inventory hold**
- [ ] Call `deduct_on_order_create(order_gid, payload)` (service role)
- [ ] Enqueue `work_queue` (`topic='inventory_push'`, `dedupe_key` set)

**Error paths**
- [ ] Transient → 5xx (Shopify retries)
- [ ] Permanent → log + 2xx (avoid retry loop)

**Validation payloads**
- [ ] One order per store with flavours
- [ ] A duplicate send (dedupe)
- [ ] A payload with internal keys → ignored as designed

---

## 🔒 RLS/RPC — 12-Step Smoke Test [15-20 mins]
1. [ ] Repo grep: no client writes to `orders_*`, inventory, etc.
2. [ ] Create test orders via webhook (both stores)
3. [ ] `get_order_for_scan` returns safe subset for ids & scans
4. [ ] `handle_print_barcode` sets `filling_start_ts` once (idempotent)
5. [ ] `complete_filling` → Covering; sets `filling_complete_ts`
6. [ ] `complete_covering` → Decorating
7. [ ] `complete_decorating` → Packing
8. [ ] `start_packing` sets `packing_start_ts` (idempotent)
9. [ ] `complete_packing` sets `packing_complete_ts`; stage → Complete
10. [ ] `assign_staff` updates `assignee_id`
11. [ ] `get_unassigned_counts/list` reflect `assignee_id IS NULL`
12. [ ] RLS: authenticated can **select**; insert/update/delete blocked

---

## 🗄️ Migrations & Data Safety
- [ ] `npx supabase migration up` clean on fresh DB
- [ ] New columns: **add → backfill → NOT NULL** (when ready)
- [ ] Enums via `alter type … add value`
- [ ] Backups (PITR 7d) confirmed before schema changes
- [ ] Down/rollback documented in `migration-order.md`

---

## 🚀 Performance & Ops (quick)
- [ ] Queue p95 < 200ms; webhook p95 < 500ms; worker p95 < 2s
- [ ] Worker backlog < 500; oldest pending < 15m
- [ ] Alerts wired: Slack on thresholds; Sentry errors triaged
- [ ] Dashboards: latency by route, webhook success, backlog trend, Web Vitals

---

## 🛡️ Security Review
- [ ] No direct table access from frontend
- [ ] All RPCs are **SECURITY DEFINER** with role checks
- [ ] Input validation on all parameters
- [ ] SQL injection mitigated (parameterized queries)
- [ ] HMAC verification on webhooks
- [ ] Signed URLs for media; no public buckets
- [ ] Secrets rotated after any exposure
- [ ] Admin ops require explicit role check

---

## ✅ Data Validation
- [ ] Foreign keys include **ON DELETE** rules
- [ ] Unique constraints prevent duplicates
- [ ] Check constraints validate business rules
- [ ] `updated_at` triggers consistent
- [ ] Orphaned records impossible
- [ ] Stage transitions validated
- [ ] Inventory cannot go negative

---

## 🔁 Pre-Production Dry Run (staging)
- [ ] Ingest → print → complete Filling → start/complete Packing
- [ ] Unassigned counts per stage are sane
- [ ] Inventory worker pushes ATS/OOS; no error spikes
- [ ] No sensitive keys in client (`VITE_*` rule holds)

---

## 🧯 Incident Response
1. Identify scope (stores, order count, services)
2. Stop the bleeding (feature flag, revert, scale down)
3. Preserve evidence (logs, DB snapshots if needed)
4. Communicate status (team + customers if needed)
5. Decide **fix-forward** vs **rollback**
6. Document all steps in incident log
7. Post-mortem within **48 hours**

---

## 🚨 Emergency Contacts
- On-call: <phone / Slack handle>
- Escalation: <manager / channel>
- Shopify Support: <ticket portal / partner contact>

---

## 🔗 Quick Links
- [ ] Supabase Dashboard: <url>
- [ ] Sentry: <url>
- [ ] PostHog: <url>
- [ ] Slack Alerts: #ordak-alerts

---

## 📊 Daily Health Check [5-10 mins]
- [ ] All queues processing (**<100 pending**)
- [ ] No orders stuck **>24h**
- [ ] Inventory sync success rate **>99%**
- [ ] No failed webhooks in last hour
- [ ] Work queue depth within normal range
- [ ] Error rate **<1%**
- [ ] DB connections **<80%** of max

---

## Notes
- “Unassigned” is **derived** (no extra stage/table).
- Stages are **single enum**; progress via timestamps; all writes via RPCs.
- Update this file whenever webhooks/RPCs/schema change materially.