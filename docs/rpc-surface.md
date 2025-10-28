# RPC Surface (Final)
**Version:** 1.0.0  
**Last Updated:** 2025-09-16  
**Status:** Production

All RPCs are **SECURITY DEFINER** and must include role validation, input guards, and **idempotency** where applicable.  
**Standard return envelope:**

```ts
export interface RPCResponse<T = any> {
  success: boolean;
  message: string | null;
  data: T | null;
  error_code: string | null;
}
Conventions
Roles: Admin | Supervisor | Staff (checked via check_user_role helper)

Stores: 'Bannos' | 'Flourlane'

Stages: Filling → Covering → Decorating → Packing → Complete

Filling starts at barcode print; scan completes Filling

No direct table writes; RLS everywhere. All mutations via RPCs

Audit logging via audit_ok (critical ops)

Advisory locks for long jobs (e.g. sync_shopify_orders)

Idempotency: repeat calls return same state (use already_done in data if helpful)

Queues
get_queue(p_store text, p_stage text default null, p_assignee_id uuid default null, p_storage text default null, p_search text default null, p_limit int default 100, p_offset int default 0)
get_order(p_store text, p_order_id text)
assign_staff(p_order_id text, p_staff uuid, p_note text default null)
set_storage(p_store text, p_order_id text, p_storage text)

Bulk assignment function lives in Cancel & Bulk Ops.

Scanner / Stage RPCs (stage-specific, safer)
handle_print_barcode(id text, performed_by uuid, context jsonb default '{}'::jsonb)
complete_filling(id text, performed_by uuid)
complete_covering(id text, performed_by uuid)
complete_decorating(id text, performed_by uuid)
start_packing(id text, performed_by uuid)
complete_packing(id text, performed_by uuid)
qc_return_to_decorating(id text, performed_by uuid, reason text)
get_order_for_scan(scan text) — normalizes bannos-#####, flour-lane-#####, QR payload; read-only

Compatibility wrappers (optional)
print_barcode(p_store text, p_order_id text) → calls handle_print_barcode
complete_stage(p_store text, p_order_id text, p_stage text, p_staff uuid) → routes to the correct stage RPC

Edit
update_order_core(p_store text, p_order_id text, p_patch jsonb) — Admin (Supervisor may have subset)

Staff / Time
get_staff_me()
start_shift(p_staff uuid)
end_shift(p_staff uuid)
start_break(p_staff uuid)
end_break(p_staff uuid)

Complete Grid
get_complete(p_store text, p_from date, p_to date, p_storage text default null, p_search text default null, p_limit int default 100, p_offset int default 0)

Settings
get_settings_printing(p_store text)
set_settings_printing(p_store text, p_cfg jsonb)
get_flavours(p_store text)
set_flavours(p_store text, p_list jsonb)
get_storage_locations(p_store text)
set_storage_locations(p_store text, p_list jsonb)
get_monitor_density(p_store text)
set_monitor_density(p_store text, p_value int)

Admin role; Supervisor may read.

Shopify / Ingest
test_storefront_token(p_store text)
connect_catalog(p_store text, p_payload jsonb)
sync_shopify_orders(p_store text, p_since timestamptz default null) — Admin only; advisory lock to prevent concurrent runs
Edge functions: orders_create_bannos / orders_create_flourlane → HMAC verify → ingest_order(p_store, payload)
ingest_order(p_store text, p_payload jsonb) → inserts order, sets stage/priority, calls deduct_on_order_create

Inventory / BOM
create_component(p_payload jsonb)
update_component(p_sku text, p_patch jsonb)
adjust_stock(p_sku text, p_delta int, p_reason text, p_order_id text default null)