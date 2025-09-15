# RPC Surface

This document lists all **SECURITY DEFINER RPCs** used by the app and Edge Functions.  
Model follows the stage flow: **Filling → Covering → Decorating → Packing → Complete**.  
All writes go through RPCs — **no direct table writes**.

---

## Conventions

- **Order ID (`id`)**: human-readable, store-prefixed (e.g., `bannos-12345`, `flourlane-67890`).
- **Auth**  
  - App uses Supabase client (tokens signed by **anon** key).  
  - Edge Functions (webhooks, reconciliation) use **service role** key.
- **Idempotency**: write RPCs set timestamps only if `NULL`; repeat calls return `already_done=true`.
- **Errors** (small, consistent set): `INVALID_STAGE`, `ALREADY_DONE`, `PERMISSION_DENIED`, `NOT_FOUND`, `BAD_INPUT`, `CONFLICT`.

Return envelope:
```ts
type Ok<T> = { ok: true; data: T }
type Err   = { ok: false; code: string; message: string }
type RpcResult<T> = Ok<T> | Err
Index
handle_print_barcode — start Filling (sets filling_start_ts)

complete_filling — end Filling → Covering

complete_covering — end Covering → Decorating

complete_decorating — end Decorating → Packing

start_packing — set packing_start_ts

complete_packing — end Packing → Complete

qc_return_to_decorating — QC fail back to Decorating

assign_staff — optional assignee (no stage change)

set_storage — update storage location

get_order_for_scan — resolve scanned code → order

get_queue — operational list (date window)

get_orders_for_dashboard — dashboard query

get_unassigned_counts — per-stage unassigned totals

get_unassigned_list — list of unassigned orders for a stage

deduct_on_order_create — inventory hold (Edge/Service role)

handle_print_barcode
Start of Filling (when barcode is printed).

Signature

sql
Copy code
-- SECURITY DEFINER
handle_print_barcode(id text, performed_by uuid, context jsonb default '{}'::jsonb)
returns jsonb
Behavior

If filling_start_ts IS NULL → set to now(); append stage event.

Else → idempotent; do not change value, return already_done=true.

Result

json
Copy code
{ "ok": true, "data": { "id": "bannos-12345", "filling_start_ts": "2025-09-15T07:20:11Z", "already_done": false } }
Errors: NOT_FOUND, PERMISSION_DENIED

complete_filling
End Filling → Covering.

sql
Copy code
complete_filling(id text, performed_by uuid)
returns jsonb
Rules

Require stage = 'Filling'.

Set filling_complete_ts if NULL; set stage = 'Covering'.

If already completed, return ALREADY_DONE.

complete_covering
Covering → Decorating.

sql
Copy code
complete_covering(id text, performed_by uuid)
returns jsonb
Rules: require stage='Covering'; set covering_complete_ts; set stage='Decorating'.

complete_decorating
Decorating → Packing.

sql
Copy code
complete_decorating(id text, performed_by uuid)
returns jsonb
Rules: require stage='Decorating'; set decorating_complete_ts; set stage='Packing'.

start_packing
Set packing_start_ts (no stage change).

sql
Copy code
start_packing(id text, performed_by uuid)
returns jsonb
Rules: require stage='Packing'; set packing_start_ts if NULL (idempotent).

complete_packing
Packing → Complete.

sql
Copy code
complete_packing(id text, performed_by uuid)
returns jsonb
Rules: require stage='Packing'; set packing_complete_ts; set stage='Complete'.

qc_return_to_decorating
Explicit QC fail from Packing back to Decorating.

sql
Copy code
qc_return_to_decorating(id text, performed_by uuid, reason text)
returns jsonb
Rules: allow from stage='Packing' (or admin from Complete if policy allows); log reason; set stage='Decorating'.

assign_staff
Optional assignee; stage does not change.

sql
Copy code
assign_staff(id text, staff_id uuid, note text default null)
returns jsonb
Validation: staff exists, approved, active. Audit is appended.

set_storage
Set/update storage location for the order.

sql
Copy code
set_storage(id text, storage text, performed_by uuid)
returns jsonb
Validation: against allowed list if configured.

get_order_for_scan
Resolve scanned string → order.

sql
Copy code
get_order_for_scan(scan text)
returns jsonb
Behavior: normalizes common inputs (bannos-#####, flour-lane-#####, QR payload), returns safe subset (id, stage, product, flavour, due_date, key timestamps). No writes.

get_queue
Operational list (e.g., this week).

sql
Copy code
get_queue(store text, date_from date, date_to date, limit int default 500)
returns setof jsonb
Filter: store + date window; exclude stage='Complete'.
Sort (recommended): priority DESC, due_date ASC, size ASC, shopify_order_number ASC.

get_orders_for_dashboard
Dashboard query (sortable/filterable).

sql
Copy code
get_orders_for_dashboard(store text, period text default 'week')
returns setof jsonb
get_unassigned_counts
Per-stage totals of unassigned orders (assignee_id IS NULL) for a store.

sql
Copy code
get_unassigned_counts(store text)
returns jsonb
Example

json
Copy code
{ "ok": true, "data": { "filling": 3, "covering": 2, "decorating": 1, "packing": 4 } }
get_unassigned_list
Paginated list of unassigned orders for a stage.

sql
Copy code
get_unassigned_list(store text, stage stage_type, limit int default 100, offset int default 0)
returns setof jsonb
Behavior: filter stage = $2 AND assignee_id IS NULL; sort as in get_queue; returns safe fields.

deduct_on_order_create (Edge / Service role)
Inventory hold on ingest.

sql
Copy code
deduct_on_order_create(order_gid text, payload jsonb)
returns jsonb
Behavior: writes stock txns, enqueues work_queue (with dedupe_key) for ATS/OOS push.

Error & Audit Model
Each write RPC appends an event (or in a consolidated logs) with:
id, action, at, performed_by, source (app/edge), meta jsonb.

Standard error payload:

json
Copy code
{ "ok": false, "code": "INVALID_STAGE", "message": "Expected stage=Packing" }
Security Notes
RLS on orders; selection scoped by store + role.

All write RPCs are SECURITY DEFINER with explicit checks; avoid dynamic SQL on user input.

Service role reserved for webhooks/reconciliation.

Testing Notes
Unit: idempotency (double print/scan), invalid-stage transitions, permission checks.

Integration: full lifecycle Filling → … → Complete, QC loop, inventory hold + reconciliation.

E2E: print barcode → scan completes Filling; start/complete Packing; dashboard reflects timestamps.