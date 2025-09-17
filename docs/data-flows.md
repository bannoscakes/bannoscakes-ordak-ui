Data Flows (Final)

Authoritative reference for end-to-end flows: **order ingestion**, **queues & workspaces**, **inventory sync**, **messaging**, **time tracking (optional)**, **order changes**, **cancellations**, **error recovery**, and **monitoring**.  
Stage model: **Filling → Covering → Decorating → Packing → Complete**.  
**No extra stage tables.** “Unassigned” = `assignee_id IS NULL` for the current stage.

---

## 1) Orders Intake (Shopify → Ordak)

**Source**: Shopify Admin webhook `orders/create` (per store)  
**Target**: `orders_bannos` or `orders_flourlane`

**Flow**
1. **Edge (service role)** receives webhook → **HMAC verify** with `SHOPIFY_WEBHOOK_SECRET`.
2. **Deduplicate** by GraphQL GID (`order.admin_graphql_api_id`) or numeric id.  
   - Duplicate → **200 OK** (no-op) and log `dedupe=true`.
3. **Validate / transform** (match **kitchen docket** logic):
   - Required: `customer`, `product`, `due_date`.
   - **Flavours/notes** from **line item properties** (case-insensitive): accept names containing “gelato flavour(s)”; **skip** `_origin`, `_raw`, `gwp`, `_LocalDeliveryID`, names starting with `_`; keep **value** only.
   - Compute human `id` (`bannos-<order_number>` / `flourlane-<order_number>`; fallback to numeric id).
4. **Schema checks**
   - Product exists in **BOM** (`product_requirements`) if enabled.
   - (Optional) **inventory preview**; if insufficient:
     - keep stage **Filling** (no new stage), set `inventory_blocked = true` (flag/metadata),
     - enqueue Shopify **OOS** update via `work_queue`,
     - alert **Supervisor**.
5. **Insert** row with `stage='Filling'`, `priority` derived from `due_date` (High/Medium/Low), plus monetary fields and `order_json` (raw payload).
6. **Inventory hold**: call `deduct_on_order_create(order_gid, payload)` → write `inventory_txn`, update `inventory_items.ats`, enqueue `work_queue` (`topic='inventory_push'`, `dedupe_key`).
7. (Optional) **Slack** notification on ingest/missing fields.

**Invalid payload**
- Store raw payload in **dead_letter** (Edge-managed) with reason; return **2xx** if permanent validation error to avoid retry storms; otherwise 5xx so Shopify retries.

---

## 2) Stage Actions (4-stage model)

All transitions by **RPC** (role-checked, **idempotent**). No `_pending` / `_in_progress` stages.

- **Filling**  
  - Print barcode → `handle_print_barcode` (sets `filling_start_ts` if `NULL`)  
  - Scan complete → `complete_filling` (sets `filling_complete_ts`, **stage → Covering**)

- **Covering**  
  - Scan complete → `complete_covering` (sets `covering_complete_ts`, **stage → Decorating**)

- **Decorating**  
  - Scan complete → `complete_decorating` (sets `decorating_complete_ts`, **stage → Packing**)

- **Packing**  
  - Scan start → `start_packing` (sets `packing_start_ts`)  
  - Scan complete → `complete_packing` (sets `packing_complete_ts`, **stage → Complete**)  
  - **QC return** (admin/policy) → `qc_return_to_decorating` (**stage → Decorating**, reason logged)

---

## 3) Queues & Workspaces

- **get_queue(store, date_from, date_to, limit)** → this-week operational list; excludes `stage='Complete'`.  
  Sort: `priority DESC, due_date ASC, size ASC, shopify_order_number ASC`.
- **Unassigned** lists/cards:
  - **Counts** → `get_unassigned_counts(store)`  
  - **List** → `get_unassigned_list(store, stage, limit, offset)`  
  - “Unassigned” means `assignee_id IS NULL`.
- **Assign** → `assign_staff(id, staff_id, note?)` (no stage change).
- (Optional) **Shifts/Breaks**: if Time & Payroll is enabled, UI may require active shift to assign; RPCs enforce.

---

## 4) Inventory Feedback to Shopify

- DB changes enqueue **`work_queue`**.  
- Worker loop (Edge/CRON):
  1) Pull `status='pending'` and eligible `next_retry_at`
  2) **Lock** (`locked_at`, `locked_by`), push ATS/OOS to Shopify
  3) Success → `status='done'`
  4) Error → `status='error'`, increment `retry_count`, set `next_retry_at` (exponential backoff), stop after `max_retries`
- **Batching & dedupe**: dedupe by `dedupe_key` (SKU+qty+order), optional short batch window (e.g., 5s).
- **Nightly reconciliation** compares local `inventory_items.ats` vs Shopify, writes corrections.

---

## 5) Messaging & Media (optional)

- **conversations / participants / messages** with RLS; unread counts by `(conversation_id, created_at desc)`.  
- **order_photos** via signed URLs; some stage completions can require photos (QC rule).

---

## 6) Time & Payroll (optional)

- RPCs: `start_shift`, `end_shift`, `start_break`, `end_break`.  
- Validations: no overlapping shifts; auto-end after policy windows (e.g., 12h), breaks limited (e.g., 2h).  
- Reports: `get_staff_times`, `get_staff_times_detail`; manual admin adjustments via RPC.

---

## 7) Order Modifications

1. Lock row (transaction) to avoid concurrent edits.  
2. Validate changes (due_date, size, product).  
3. Recompute `priority` if due_date changes.  
4. Adjust inventory: release old holds, reserve new.  
5. Log **stage_events** with reason; notify assignee if still assigned.

---

## 8) Order Cancellations

1. Shopify cancellation webhook → HMAC verify.  
2. Locate order; if not **Complete**:
   - release inventory holds, write positive correction txns,
   - clear assignee,
   - mark cancellation (flag/metadata) and log event,
   - enqueue **work_queue** to restore ATS in Shopify.

---

## 9) Error Recovery Flows

- **Failed webhooks**: record raw payload in **dead_letter**, retry with backoff; alert after threshold.  
- **Failed inventory sync**: `work_queue.status='error'` with reason; have `retry_failed_sync` RPC; daily report.  
- **Orphaned orders**: job finds orders stuck in a stage > 24h; alert Supervisor; escalate > 48h.

---

## 10) Monitoring & Metrics

Targets (see `performance-slas.md` for full table):
- Webhook **p95 < 500ms**; success ≥ 99.5% after retries.  
- Worker p95 < 2s; backlog < 500 or oldest pending < 15m.  
- Unassigned > 2h → alert.  
- Stage transition errors logged; concurrency/shift violations flagged.

**Instrumentation**
- Edge: structured timings `{route, t_ms, ok}`, error codes.  
- Optional `api_logs` table for percentiles; Sentry for exceptions; Slack for alerts.

---

## 11) Security Notes

- **RLS everywhere**; clients are **read-only**.  
- Mutations via **SECURITY DEFINER RPCs** with strict role checks and idempotency.  
- **Service role** only in Edge Functions (webhooks, worker, reconcile).

---

## References
See `docs/references.md` for official docs (Node, React/Vite/TS, Supabase, Shopify, etc.).
