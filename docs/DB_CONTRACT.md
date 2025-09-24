# Ordak v2 — DB Contract (UI ↔ DB)

## Key enums (shared)
- StoreKey: "bannos" | "flourlane"
- Stage: "unassigned" | "filling" | "covering" | "decorating" | "packing" | "quality_check" | "complete" | "ready"

> UI defaults assume the above spellings; back-end must use the same text values.

---

## Base table: `public.orders`
Columns:
- `id uuid pk default gen_random_uuid()`
- `store text not null`   — one of StoreKey
- `stage text not null`   — one of Stage
- `title text not null`
- `priority int not null default 0`
- `due_date date null`
- `barcode text unique null`

Indexes:
- `idx_orders_store_stage (store, stage)`
- `idx_orders_barcode (barcode)`

RLS (staging read-only):
- Enable RLS.
- Policy: anon SELECT true (read-only); writes come later via RPC/Edge.

---

## Views (UI reads from views)

### `public.queue_view`
Purpose: UI list/metrics
- `id, store, stage, title, priority, due_date`
Source: `select id, store, stage, title, priority, due_date from public.orders;`

### `public.orders_view`
Purpose: scanner lookup
- `id, store, stage, title, barcode`
Source: `select id, store, stage, title, barcode from public.orders;`

> These names are what the UI real RPCs use by default:
> - `VITE_QUEUE_SOURCE`  → default "queue_view"
> - `VITE_ORDERS_SOURCE` → default "orders_view"

---

## UI ↔ DB field mapping

| UI field              | DB source              |
|-----------------------|------------------------|
| queue item: `id`      | `queue_view.id`        |
| `store`               | `queue_view.store`     |
| `stage`               | `queue_view.stage`     |
| `title`               | `queue_view.title`     |
| `priority`            | `queue_view.priority`  |
| `due_date` (date)     | `queue_view.due_date`  |
| scan: `barcode`       | `orders_view.barcode`  |

---

## Future writes (not in this doc's SQL)
- `advance_stage(order_id, next_stage)` via RPC/Edge with SECURITY DEFINER and validation.
- `handle_print_barcode(order_id)` via server event/logging (no PII in client logs).

---

## Defaults & envs
- `VITE_USE_MOCKS=true` (default; flip only on a test branch)
- `VITE_QUEUE_SOURCE="queue_view"`
- `VITE_ORDERS_SOURCE="orders_view"`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for read-only staging

This doc is the contract; migrations must implement exactly these names.
