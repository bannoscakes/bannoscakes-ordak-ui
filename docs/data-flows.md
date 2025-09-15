# Data Flows

This doc describes how data moves through Ordak: **order ingestion**, **stage actions**, **assignment**, **queues**, **inventory sync**, and **error handling**.

---

## 1) Order Ingestion (Shopify → Ordak)

**Source:** Shopify Admin Webhook `orders/create` (per store)  
**Target:** `orders_bannos` or `orders_flourlane` (chosen by shop)

**Steps**
1. **Edge Function (service role)** receives webhook and verifies HMAC using `SHOPIFY_WEBHOOK_SECRET`.
2. Deduplicate:
   - idempotency key = `order.id` or `order.admin_graphql_api_id`  
   - skip if we’ve already processed this `order_gid` (log and return 200).
3. Enrich/transform:
   - pick the **store** from shop domain (`bannos…` or `flourlane…`).
   - compute human **`id`**: `bannos-<order_number>` or `flourlane-<order_number>` (fallback to `id`).
   - extract `customer_name`, `product_title`, `flavour`, `notes`, `currency`, `total_amount`.
   - set `stage = 'Filling'`, derive **priority** from **due_date** (High/Medium/Low).
4. **Insert** into the correct orders table (`orders_bannos` / `orders_flourlane`).
5. **Inventory hold**: call RPC `deduct_on_order_create(order_gid, payload)` → writes stock txns + enqueues `work_queue`.
6. **Log event** `order_ingested` with store, ids, timing.
7. (Optional) **Slack** notify on ingest or if fields are missing.

**On failures**
- Return 5xx to let Shopify retry (Shopify retries several times).  
- Also enqueue a `work_queue` `topic=order_ingest_retry` with `dedupe_key=order_gid`.

---

## 2) Stage Actions (4-stage model)

**Enum:** `Filling → Covering → Decorating → Packing → Complete`  
All stage changes happen via RPCs (idempotent, role-checked). There are **no extra “pending/in_progress” statuses**.

### Filling
- **Print barcode** → `handle_print_barcode(id, user, ctx)`  
  - sets `filling_start_ts` **only if NULL**.
- **Scan (complete)** → `complete_filling(id, user)`  
  - sets `filling_complete_ts`; `stage → Covering`.

### Covering
- **Scan complete** → `complete_covering(id, user)`  
  - sets `covering_complete_ts`; `stage → Decorating`.

### Decorating
- **Scan complete** → `complete_decorating(id, user)`  
  - sets `decorating_complete_ts`; `stage → Packing`.

### Packing
- **Scan start** → `start_packing(id, user)`  
  - sets `packing_start_ts`.
- **Scan complete** → `complete_packing(id, user)`  
  - sets `packing_complete_ts`; `stage → Complete`.
- **QC fail (optional)** → `qc_return_to_decorating(id, user, reason)`  
  - `stage → Decorating` (events/audit record why).

---

## 3) Assignment Flow (Unassigned is not a stage)

- An order is **unassigned** when **`assignee_id IS NULL`** for its current stage.  
- **Assign** staff → `assign_staff(id, staff_id, note?)` (no stage change).  
- **Storage** location update → `set_storage(id, storage, user)`.

**Queries**
- `get_unassigned_counts(store)` → `{ filling, covering, decorating, packing }`  
- `get_unassigned_list(store, stage, limit, offset)` → paginated list

---

## 4) Queues & Dashboard

**Operational queue (this week)**
- `get_queue(store, date_from, date_to, limit)`  
  - filters on store + date window, excludes `stage='Complete'`  
  - recommended sort: `priority DESC, due_date ASC, size ASC, shopify_order_number ASC`

**Dashboard**
- `get_orders_for_dashboard(store, period='week')`  
  - aggregates/filters for kiosk/monitor views

Indexes that power this are in **schema-and-rls.md** (queue + unassigned partial indexes).

---

## 5) Inventory Sync

**On ingest**
- `deduct_on_order_create`:
  - writes `inventory_txn` rows (negative qty for holds)
  - updates `inventory_items.ats`
  - enqueues `work_queue` item with `topic='inventory_push'`, `dedupe_key=sku+qty+order_gid`

**Worker (Edge Function / CRON)**
- Polls `work_queue WHERE status='pending' AND (next_retry_at IS NULL OR next_retry_at <= now())`
- Locks one item (`locked_at`, `locked_by`), pushes **ATS/OOS** to Shopify Admin API
- On success → `status='done'`
- On error → set `status='error'`, increment `retry_count`, compute `next_retry_at` (exponential backoff); stop after `max_retries`

**Nightly reconciliation**
- Compares local `inventory_items.ats` vs Shopify; writes correction txns and pushes updates.

---

## 6) Error Handling & Idempotency

- All write RPCs treat “already complete” as **`ok: true, already_done: true`** (no-op).  
- Webhooks use **order_gid** dedupe; `work_queue` uses **`dedupe_key`** per topic.  
- Any unexpected state mismatch → return a structured error `{ ok:false, code, message }` and log an event.

---

## 7) Barcode / Scan Formats

**Accepted scan inputs** (normalized by `get_order_for_scan(scan)`):
- `bannos-#####`, `flour-lane-#####` or QR payloads that include the id
- Function returns safe subset: `id, stage, product_title, flavour, due_date, key timestamps`

---

## 8) Monitoring

- **Sentry**: RPC/Edge exceptions, webhook failures.  
- **Slack**: critical alerts (webhook failures, worker stuck).  
- **PostHog**: feature usage (prints, scans, assignments).

---

## 9) Security Notes

- RLS enabled on all tables; clients read-only via policies.  
- **Service role** used only in Edge Functions (webhooks, worker, reconciliation).  
- All mutations go through **SECURITY DEFINER RPCs** that validate roles & inputs.

---

## 10) Health Checks

- `/edge/health` returns `up` + DB ping latency.  
- Worker exposes processed items/min, error rate, last run timestamps.
