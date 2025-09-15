# Checklists

Practical, repeatable lists for releases, webhooks, RLS/RPC smoke tests, Tailwind v4, performance, and backups.

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

> Goal: match **kitchen docket** extraction exactly, with safe idempotency.

**Verify secrets & mapping**
- [ ] `SHOPIFY_WEBHOOK_SECRET` correct for each store  
- [ ] Token per store (`SHOPIFY_BANNOS_TOKEN`, `SHOPIFY_FLOURLANE_TOKEN`)  
- [ ] Route picks store from shop domain

**Idempotency**
- [ ] Deduplicate by **GraphQL GID** (`order.admin_graphql_api_id`) or numeric id  
- [ ] Return `200` on duplicate (no-op)  
- [ ] Log dedupe

**Field extraction (match docket logic)**
- [ ] Human `id`: `bannos-<order_number>` / `flourlane-<order_number>` (fallback to id)  
- [ ] Customer, product title, currency, totals  
- [ ] **Flavour(s) & notes** from **line item properties** with filtering:
  - Skip internal keys: names that include `_origin`, `_raw`, `gwp`, `_LocalDeliveryID`, or start with `_`
  - Accept properties where name contains **“gelato flavour”** or **“gelato flavours”** (case-insensitive)
  - Keep only the **value** (not the property name)
- [ ] `stage='Filling'` on insert  
- [ ] Derive `priority` from **due_date** (High/Medium/Low)  
- [ ] Save **raw payload** to `order_json` for audit

**Inventory hold**
- [ ] Call `deduct_on_order_create(order_gid, payload)` (service role)  
- [ ] Enqueue `work_queue` (`topic='inventory_push'`, `dedupe_key` set)

**Error paths**
- [ ] On transient failure → respond 5xx so Shopify retries  
- [ ] On permanent validation error → log + 2xx (do not loop)

**Validation payloads**
- [ ] One order per store (Bannos/Flourlane) with flavours in properties  
- [ ] A duplicate send (dedupe tested)  
- [ ] A payload with internal keys to ensure they’re ignored

---

## 🔒 RLS/RPC — 12-Step Smoke Test (fast)

1. [ ] **Repo grep**: no client writes to `orders_*`, inventory, etc. (RPCs only)  
2. [ ] **Create test orders** via webhook (both stores)  
3. [ ] **get_order_for_scan** returns safe subset for ids & scan strings  
4. [ ] **handle_print_barcode** sets `filling_start_ts` once (idempotent repeat)  
5. [ ] **complete_filling** moves stage → Covering; sets `filling_complete_ts`  
6. [ ] **complete_covering** → Decorating  
7. [ ] **complete_decorating** → Packing  
8. [ ] **start_packing** sets `packing_start_ts` (idempotent repeat)  
9. [ ] **complete_packing** sets `packing_complete_ts`; stage → Complete  
10. [ ] **assign_staff** updates `assignee_id` (no stage change)  
11. [ ] **get_unassigned_counts/list** reflect `assignee_id IS NULL` by stage  
12. [ ] **RLS**: authenticated users can **select**; direct insert/update/delete are blocked

---

## 🎨 Tailwind v4 / Frontend Build Checklist

- [ ] `@import "tailwindcss"` in your global CSS (no legacy config)  
- [ ] Remove old `@tailwind base|components|utilities` if v4 preset used  
- [ ] Clear caches: delete `.vite`, `node_modules`, `dist`, restart dev server  
- [ ] Check shadcn & icons imports; tree-shake unused components  
- [ ] Verify LCP/INP targets (see `performance-slas.md`)

---

## 🚀 Performance & Ops (quick)

- [ ] Queue p95 < 200ms; webhook p95 < 500ms; worker p95 < 2s  
- [ ] Worker backlog < 500, oldest pending < 15m  
- [ ] Alerts wired: Slack on thresholds; Sentry errors triaged  
- [ ] Dashboards: latency by route, webhook success, backlog trend, Web Vitals

---

## 🗄️ Migrations & Data Safety

- [ ] `npx supabase migration up` applies cleanly on fresh DB  
- [ ] New columns add → backfill → set NOT NULL (if needed)  
- [ ] Enum changes via `alter type … add value`  
- [ ] Backups (PITR 7d) confirmed before schema changes  
- [ ] Down/rollback strategy documented in `migration-order.md`

---

## 🔁 Pre-Release Dry Run (staging)

- [ ] Ingest → print → complete Filling → start/complete Packing  
- [ ] Unassigned counts per stage are sane  
- [ ] Inventory worker pushes ATS/OOS; no error spikes  
- [ ] No sensitive keys exposed to client (`VITE_*` rule holds)

---

## 🧯 Incident Mini-Card (P1 quick)

1. **Freeze amplification** (pause webhooks if needed)  
2. Roll back app (`git revert` + deploy) or compensate schema  
3. Restore via PITR if data corruption (see `backup-recovery.md`)  
4. Replay Shopify deliveries after fix  
5. Postmortem within 48h (timeline, cause, follow-ups)

---

## ✍️ Notes

- “Unassigned” is **derived** (no extra stage/table).  
- Stages are **single enum**; progress uses timestamps; **all writes via RPCs**.  
- Keep this file updated after major changes to webhooks, RPCs, or schema.