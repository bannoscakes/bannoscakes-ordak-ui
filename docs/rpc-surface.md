# Ordak – System Overview

## Repos & Branches
- Repo: `bannoscakes-ordak-ui`
- Branch model: **dev (default)** ← active development with Cursor | **main** ← merge after review
- Git rules: `dev` is open; `main` is protected (no force pushes)

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript  
- **Styling**: Tailwind CSS v4 (configless, `@import "tailwindcss"`)  
- **UI Components**: shadcn/ui, lucide-react, recharts  
- **Backend**: Supabase (Postgres, Auth, RLS, Edge Functions)  
- **Integrations**: Shopify Admin API (orders, products, inventory), Slack (alerts), Sentry, PostHog

## Database Core Principles
- All writes via **SECURITY DEFINER RPCs** (no direct table writes)  
- **Row Level Security (RLS)** on all tables  
- **Date-only `due_date`**; **priority** is derived: **High** (today/overdue), **Medium** (tomorrow), **Low** (later)  
- **Stage is a single enum**; progress is captured by **timestamps + events** (no auxiliary status tables)

---

## Orders: ID Strategy & Core Columns

### ID Strategy
- **Human ID** `id text` (store-prefixed, scanner-friendly), e.g. `bannos-12345`  
- **Surrogate** `row_id uuid DEFAULT gen_random_uuid()` for FK safety  
- Enforce **uniqueness on `id`**  
- Store **Shopify identifiers** for reconciliation

### Orders Tables (`orders_bannos`, `orders_flourlane`)
Minimum columns:

- `row_id uuid`  
- `id text` (human ID)  
- `shopify_order_id bigint`  
- `shopify_order_gid text`  
- `shopify_order_number int`  
- `customer_name text`  
- `product_title text`  
- `flavour text`  
- `notes text`  
- `currency char(3)`  
- `total_amount numeric(12,2)`  
- `order_json jsonb` (raw payload for audit/debug)  
- `stage stage_type` (enum: **Filling → Covering → Decorating → Packing → Complete**)  
- `priority smallint`  
- `assignee_id uuid`  
- `storage text`  
- **Operational timestamps**  
  - `filling_start_ts timestamptz` (**set on barcode print**)  
  - `filling_complete_ts timestamptz` (**set on scan to end Filling**)  
  - `covering_complete_ts timestamptz`  
  - `decorating_complete_ts timestamptz`  
  - `packing_start_ts timestamptz`  
  - `packing_complete_ts timestamptz`  
- `created_at timestamptz DEFAULT now()`  
- `updated_at timestamptz DEFAULT now()` (**trigger** updates on any change)

---

## Stage Flow

### Enum
`stage_type` = **Filling | Covering | Decorating | Packing | Complete**

### Transitions (RPC-driven)
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
  - **QC fail** (optional) → `return_to_decorating` → **stage → Decorating** with reason logged

> Transitions validate **roles**, enforce **idempotency** (safe re-print/re-scan), and check **timeline sanity**.

---

## Stage Transition Validation
- Enforced inside **RPCs** (roles, timestamps, idempotency)  
- Guards:  
  - Allow **forward** progress and safe **repeats**  
  - Allow admin **jump to `Complete`**  
  - Block **invalid backward transitions** (except explicit QC path)

---

## Multi-Store Rules
- Separate order tables per store: `orders_bannos`, `orders_flourlane`  
- Shared **staff** and **inventory** across stores with audit separation  
- Independent **webhook tokens/secrets** per store

---

## Inventory & Work Queue
- On order create: `deduct_on_order_create` reserves components and writes stock txns  
- Stock deltas enqueue **`work_queue`** for Shopify ATS/OOS updates

**`work_queue` fields (minimum):**
- `priority int DEFAULT 5`  
- `status text DEFAULT 'pending'` (pending / processing / done / error)  
- `max_retries int DEFAULT 3`, `retry_count int DEFAULT 0`  
- `next_retry_at timestamptz`, `locked_at timestamptz`, `locked_by text`  
- `last_error text`, `dedupe_key text UNIQUE`

A worker processes `work_queue`; nightly reconciliation compares local ATS vs Shopify.

---

## Messaging
- Tables: `conversations`, `conversation_participants`, `messages`  
- Index `(conversation_id, created_at DESC)` for unread lookups

---

## Indexes & Performance
- **Queues:** `(priority, due_date, size, order_number)` WHERE `stage <> 'Complete'`  
- **Assignee:** `(assignee_id, stage, due_date)`  
- **Stage timestamps:** `(row_id, stage, filling_start_ts / …, created_at DESC)`  
- **Work Queue:** `(status, priority, next_retry_at)` partial index (pending/error)  
- **Messages:** `(conversation_id, created_at DESC)`

---

## Migrations Roadmap
- **M0 — Core**: order tables, stage enum, triggers, guards, indexes; `staff_shared`; (optional) `stage_events`  
- **M1 — Settings**: printing, due_date defaults, flavours, storage  
- **M2 — Shopify**: tokens, `sync_runs`, webhook skeletons  
- **M3 — Inventory/BOM**: items, txns, holds, `work_queue`, BOM, product_requirements  
- **M4 — Inventory Sync**: retries/locking/dedupe  
- **M5 — Workflows**: RPCs (queue/assign/print/complete/get_order/set_storage)  
- **M6 — Messaging**: conversations/messages, unread counters  
- **M7 — Media/QC**: order_photos + signed-URL RPCs  
- **M8 — Time & Payroll**: shifts, breaks, RPCs, reports

---

## Security
- RLS **everywhere**; client uses **anon** key; **service role** only in Edge Functions  
- PII minimization in logs; operational events are structured, no customer payloads

---

## Environments
- **Local (dev)**: Vite dev server + a dev Supabase project  
- **Staging**: schema matches prod; used for release verification  
- **Production**: deploy from `main`; nightly backups with PITR (7 days)

---

## How to Run Locally
```bash
npm install
npm run dev
# open the shown localhost URL (default http://localhost:3000)
