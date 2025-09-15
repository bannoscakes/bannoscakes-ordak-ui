# Ordak – System Overview

## Repos & Branches
- Repo: `bannoscakes-ordak-ui`
- Branch model: **dev (default)** ← active development with Cursor | **main** ← merge after review
- Git rules: dev is free; main is protected (no force pushes)

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript  
- **Styling**: Tailwind CSS v4 (configless, `@import "tailwindcss"`)  
- **UI Components**: shadcn/ui, lucide-react, recharts  
- **Backend**: Supabase (Postgres, Auth, RLS, Edge Functions)  
- **Integrations**: Shopify Admin API (orders, products, inventory)

## Database Core Principles
- All writes through **SECURITY DEFINER RPCs** only (no direct table writes)  
- **Row Level Security (RLS)** on all tables  
- **Date-only `due_date`**; **priority** derived as: **High** (today/overdue), **Medium** (tomorrow), **Low** (later)  
- **No “pending / in_progress” status tables.** Stage is a single enum value; progress comes from **events + timestamps**.

---

## Orders: ID Strategy & Columns

### ID Strategy(
- Keep **text `id`** (human-readable, store-prefixed; scanner-friendly), e.g. `bannos-12345`  
- Add surrogate **`row_id uuid DEFAULT gen_random_uuid()`** for safe FK references  
- Enforce **uniqueness on `id`**  
- Store **Shopify identifiers** for reconciliation

### Orders Tables (`orders_bannos`, `orders_flourlane`)
Include (at minimum):
- `row_id uuid` (surrogate PK or unique)  
- `id text` (human ID)  
- `shopify_order_id bigint` (numeric ID)  
- `shopify_order_gid text` (GraphQL global ID)  
- `shopify_order_number int` (short number visible to customer)  
- `customer_name text`  
- `product_title text`  
- `flavour text`  
- `notes text`  
- `currency char(3)`  
- `total_amount numeric(12,2)`  
- `order_json jsonb` (raw payload for debugging/audit)  
- `stage stage_type` (enum: **Filling → Covering → Decorating → Packing → Complete**)  
- `priority smallint`  
- `assignee_id uuid`  
- `storage text`  
- **Timestamps (stored for speed):**  
  - `filling_start_ts timestamptz` (**set on barcode print**)  
  - `filling_complete_ts timestamptz` (**set on scan to end Filling**)  
  - `covering_complete_ts timestamptz`  
  - `decorating_complete_ts timestamptz`  
  - `packing_start_ts timestamptz`  
  - `packing_complete_ts timestamptz`  
- `created_at timestamptz DEFAULT now()`  
- `updated_at timestamptz DEFAULT now()` (trigger)

**Trigger:** auto-update `updated_at` on any row modification.

---

## Stage Flow 

### Enum
`stage_type` = **Filling | Covering | Decorating | Packing | Complete**

### Transitions (via RPCs only)
- **Filling**
  - (Assign staff optional)
  - **Print barcode** → `handle_print_barcode` sets **`filling_start_ts`**
  - **Scan barcode (complete)** → `complete_filling` sets **`filling_complete_ts`**, **stage → Covering**

- **Covering**
  - (Assign staff optional)
  - **Scan complete** → `complete_covering` sets **`covering_complete_ts`**, **stage → Decorating**

- **Decorating**
  - (Assign staff optional)
  - **Scan complete** → `complete_decorating` sets **`decorating_complete_ts`**, **stage → Packing**

- **Packing**
  - **Scan start** → `start_packing` sets **`packing_start_ts`**
  - **Scan complete** → `complete_packing` sets **`packing_complete_ts`**, **stage → Complete**
  - **QC fail** (optional) → `return_to_decorating` (**stage → Decorating**) with reason

> All transitions validated for **roles**, **idempotency**, and **timeline sanity**.  
> **No `_pending`/`_in_progress` tables or statuses.**

## Assignment Model & “Unassigned” Cards

- **Unassigned is not a stage and not a separate table.**
- An order is **unassigned** when its **`assignee_id IS NULL`** for the **current `stage`**.
- The UI shows 4 cards per store: **Filling / Covering / Decorating / Packing Unassigned** (counts + quick lists).
- Assignment is **optional**; assigning a staff member does **not** change stage.
- Typical queries are provided via RPCs (see `rpc-surface.md`):
  - `get_unassigned_counts(store)` → `{ filling: 3, covering: 2, decorating: 1, packing: 4 }`
  - `get_unassigned_list(store, stage, limit, offset)` → list of orders awaiting assignment for that stage.

### Suggested Indexes for Unassigned
For each store table (e.g. `orders_bannos`, `orders_flourlane`):

- Partial index to power counts/lists quickly:
  - `(stage, due_date, priority)` **WHERE `assignee_id IS NULL AND stage <> 'Complete'`**
- If you frequently filter by size or time window, add those columns to the index keys.

---

## Stage Transition Validation
- Enforced in **RPCs** (roles, timestamps, idempotency)  
- Defensive guards:
  - Allow **forward** progress and **idempotent** repeats  
  - Allow admin **jump to `Complete`**  
  - Block **invalid backward transitions** (except explicit QC to Decorating)

---

## Inventory Sync
- **On order create:** `deduct_on_order_create` reduces stock and reserves components  
- Enqueue `work_queue` on stock change  
- **Work queue**:
  - `priority int DEFAULT 5`, `status text DEFAULT 'pending'` (pending/processing/done/error)  
  - `max_retries int DEFAULT 3`, `retry_count int DEFAULT 0`  
  - `next_retry_at timestamptz`, `locked_at timestamptz`, `locked_by text`  
  - `last_error text`, `dedupe_key text UNIQUE`  
- **Worker** pushes ATS/OOS to Shopify; nightly reconciliation compares local ATS vs Shopify

---

## Messaging
- `conversations`, `conversation_participants`, `messages`  
- Index `(conversation_id, created_at DESC)` for unread lookups

---

## Indexes & Performance
- **Orders (Queues):** `(priority, due_date, size, order_number)` WHERE `stage <> 'Complete'`  
- **Orders (Assignee):** `(assignee_id, stage, due_date)`  
- **Stage timestamps:** `(row_id, stage, filling_start_ts/filling_complete_ts/…, created_at DESC)`  
- **Work Queue:** `(status, priority, next_retry_at)` partial index (pending/error)  
- **Messages:** `(conversation_id, created_at DESC)`

---

## Migrations Roadmap
- **M0 — Core**: orders tables (fields, triggers, stage enums, guards, indexes), staff_shared, stage_events (optional)  
- **M1 — Settings**: printing, due_date defaults, flavours, storage  
- **M2 — Shopify**: tokens, sync_runs, webhook skeletons  
- **M3 — Inventory/BOM**: items, txn, holds, work_queue, BOM, product_requirements  
- **M4 — Inventory Sync**: extend work_queue with retries, locking, dedupe  
- **M5 — Workflows**: RPCs for queue/assign/print/complete/get_order/set_storage  
- **M6 — Messaging**: conversations/messages, unread counters  
- **M7 — Media/QC**: order_photos + signed URL RPCs  
- **M8 — Time & Payroll**: shifts, breaks, RPCs, reports

---

## Security
- RLS **everywhere**; client uses anon key; **service role** only in Edge Functions  
- PII minimization in logs; operational events are structured without customer payloads

---

## How to Run Locally
```bash
npm install
npm run dev
# open the shown localhost URL (default http://localhost:3000)
