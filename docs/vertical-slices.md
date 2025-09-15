# Vertical Slices (Implementation Order)

Deliver the product in small, shippable slices. Each slice includes **schema/RPCs + UI + tests + ops**.  
Stage model: **Filling → Covering → Decorating → Packing → Complete** (single enum).  
**Filling starts at barcode print**, **scan ends Filling**. “Unassigned” is **not a stage** (it’s `assignee_id IS NULL`).

---

## VS0 — Project Skeleton & Guardrails (DONE / BASELINE)
**Goal:** Dev env runs, docs in place, RPC-only writes enforced.

- Repo & docs: README, overview, schema/RLS, RPC surface, flows, ops, testing, runbook.
- Vite + React + TS; Tailwind v4; shadcn/ui.
- Supabase project connected; RLS enabled; **no client direct writes**.
- CI runs tests & migrations (green).
- Healthcheck endpoint(s).

**Definition of Done (DoD)**
- `npm run dev` runs locally.
- `npx supabase migration up` clean on dev.
- A trivial RPC smoke test passes.

---

## VS1 — Orders Core (Schema + RLS + Minimal UI)
**Goal:** Orders tables per store with stage enum & timestamps; list visible in UI.

- Schema: `orders_bannos`, `orders_flourlane`, enum `stage_type`, triggers `updated_at`.
- Columns include human `id`, `row_id`, Shopify IDs, **operational timestamps**, `assignee_id`, `storage`.
- RLS: `select` to authenticated; **no write policies**.
- UI: minimal OrdersTable showing both stores (mock data ok until VS2).
- Indexes: queue (incomplete) + unassigned partial indexes.

**DoD**
- Can insert a sample row and see it in UI (dev tooling/seed).
- `get_orders_for_dashboard` returns data.

---

## VS2 — Webhook Ingest (Orders/Create)
**Goal:** Create real orders from Shopify webhook; kitchen-docket–exact extraction.

- Edge: `orders/create` receiver, HMAC verify.
- Dedup by `order_gid`; return 200 on duplicate.
- Extract fields:
  - Human `id`: `bannos-<order_number>` / `flourlane-<order_number>` (fallback to numeric id).
  - **Flavours/notes from line item properties** matching “gelato flavour(s)” (case-insensitive), **skip** `_origin`, `_raw`, `gwp`, `_LocalDeliveryID`, names starting `_`.
- Set `stage='Filling'`, derive `priority` from `due_date`.
- Save `order_json` raw payload.
- Inventory hold: call `deduct_on_order_create`.

**DoD**
- One Bannos + one Flourlane order ingested end-to-end.
- Duplicate replay returns 200/no-op.
- Flavour extraction matches kitchen docket examples.

---

## VS3 — Filling Slice (Print & Complete + Scanner)
**Goal:** Lock in the first stage with correct timestamps and idempotency.

- RPCs: `handle_print_barcode` (sets `filling_start_ts` if NULL), `complete_filling` (sets `filling_complete_ts`, stage→Covering).
- UI:
  - OrdersTable row actions for Filling: **Print**, **Complete**.
  - Scanner screen (resolves `bannos-#####` / `flour-lane-#####` / QR via `get_order_for_scan`).
- Tests: idempotent re-print/re-scan; invalid stage protection.

**DoD**
- Print → start ts set once.
- Scan complete → stage becomes Covering.
- Scanner-only flow works on a test code.

---

## VS4 — Covering & Decorating Slices
**Goal:** Finish middle stages with minimal UX changes.

- RPCs: `complete_covering`, `complete_decorating`.
- UI: show only valid actions for current stage.
- Tests: invalid stage attempts rejected; idempotency safe.

**DoD**
- End-to-end through Decorating with timestamps.

---

## VS5 — Packing & QC Return
**Goal:** Close the lifecycle with start/complete and optional QC return.

- RPCs: `start_packing` (sets `packing_start_ts`), `complete_packing` (sets `packing_complete_ts`, stage→Complete), `qc_return_to_decorating` (admin/specific policy).
- UI: Packing mode shortcut screen (start/complete only) + QC return (guarded).
- Tests: idempotent start; complete marks `Complete`; QC path returns to Decorating with reason.

**DoD**
- Full flow: Ingest → Print → Complete Filling → … → Start/Complete Packing → **Complete**.

---

## VS6 — Assignment & “Unassigned” Cards
**Goal:** Assignment is first-class without new stages/tables.

- RPCs: `assign_staff`, `get_unassigned_counts`, `get_unassigned_list`.
- UI: Unassigned cards per stage per store; assign dialog; storage dialog.
- Indexes confirm fast counts/lists: `WHERE assignee_id IS NULL AND stage <> 'Complete'`.

**DoD**
- Counts match SQL sanity; lists paginate; assignment updates UI without stage change.

---

## VS7 — Queue & Dashboard (Operational Views)
**Goal:** Shop-floor usability: this-week queue & high-level dashboard.

- RPCs: `get_queue(store, date_from, date_to, limit)`, `get_orders_for_dashboard(store, period)`.
- UI:
  - Queue per store with quick filters (Unassigned/Today/Week).
  - Dashboard: Unassigned metrics, worker backlog, today-by-stage.
- Sorting: `priority DESC, due_date ASC, size ASC, order_number ASC`.

**DoD**
- Operators can run shift with Queue + Dashboard alone.

---

## VS8 — Inventory Worker & Reconciliation
**Goal:** Keep ATS/OOS in sync with Shopify.

- Tables: `inventory_items`, `inventory_txn`, `work_queue` (+ indexes).
- RPC: `deduct_on_order_create` (service-role).
- Worker (Edge/cron): lock → push → done/error with backoff; dedupe by key.
- Nightly reconcile job (compare ats vs Shopify; push diffs).

**DoD**
- Ingest triggers hold; worker drains queue; simple reconcile succeeds.

---

## VS9 — Monitoring & Alerts
**Goal:** Visibility and early warnings.

- Sentry wired; Slack alerts for thresholds (queue p95>300ms, webhook 5xx>1%, backlog>500).
- Optional `api_logs` for p95 per route.
- Dashboards (provider or SQL-driven).

**DoD**
- Synthetic test triggers alert; dashboards show data.

---

## VS10 — Admin Settings
**Goal:** Editable flavours/storage/staff from UI (admin-only).

- RPCs for CRUD or use keyed settings.
- UI gated by role.
- RLS policies remain read-only for clients; writes via RPC only.

**DoD**
- Admin can update options; UI reflects changes.

---

## VS11 — Performance Pass
**Goal:** Hit SLOs in `performance-slas.md`.

- Verify partial indexes; add missing ones from real EXPLAIN plans.
- Reduce over-fetching; cache safe GETs; virtualize large lists.
- Front-end LCP/INP targets; bundle size check.

**DoD**
- Queue p95 < 200ms; Webhook p95 < 500ms; Worker p95 < 2s; LCP p75 < 2.5s.

---

## VS12 — Messaging (Optional)
**Goal:** Lightweight threads per order/shift.

- Tables: `conversations`, `conversation_participants`, `messages` + RLS & indexes.
- UI: per-order thread.
- Ops: no PII in messages; retention policy if needed.

**DoD**
- Users in conversation can read/write; others cannot.

---

## VS13 — Media / QC (Optional)
**Goal:** Attach photos for QC or reference.

- Table: `order_photos` (order_id, url, taken_at, meta).
- RPCs for signed upload/download; storage policies.
- UI: photo widget on order detail.

**DoD**
- Upload/view within limits; links are signed & short-lived.

---

## VS14 — Time & Payroll (Optional)
**Goal:** Shifts, breaks, and basic reporting.

- Tables: `shifts`, `breaks`; summaries.
- RPCs to clock-in/out; report per staff/date.
- UI: simple kiosk + admin report.

**DoD**
- Day-level report matches sample data.

---

## Feature Flags / Safety
- Keep new slices behind a local or env flag when risky.
- For schema changes use **nullable → backfill → enforce** pattern.
- Every slice adds **tests** and updates **docs**.

---

## Backout Plan (per slice)
- App-only regression → `git revert` + redeploy.
- Schema-linked regression → compensating forward migration (re-add dropped cols as nullable); avoid destructive down in prod.
- Webhook blow-ups → pause route, fix, replay deliveries.

---

## Acceptance Template (reuse per slice)

- [ ] Schema created/updated with idempotent migrations  
- [ ] RPCs added/updated with role checks & idempotency  
- [ ] UI wired with only valid actions per stage  
- [ ] Tests: unit + integration (E2E where needed)  
- [ ] Ops: logs/alerts updated  
- [ ] Docs updated: overview, rpc-surface, schema-and-rls, data-flows (if impacted)