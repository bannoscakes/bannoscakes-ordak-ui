# Migration Order

Purpose: define the **sequence** and **rules** for database changes so we can evolve safely across dev → staging → production.  
Model: single stage enum (**Filling → Covering → Decorating → Packing → Complete**), all writes via **SECURITY DEFINER RPCs**, RLS everywhere.

---

## Conventions

- **CLI**  
  - Create: `npx supabase migration new <name>`  
  - Apply: `npx supabase migration up`  
  - Reset dev only: `npx supabase db reset` *(dev convenience, never in prod)*
- **Naming**: prefix with milestone for clarity, e.g. `M0_core`, `M3_inventory_bom`.
- **Idempotent SQL**: use `if not exists`, `create or replace`, `drop … if exists`.
- **Transactions**: wrap each migration in a single `begin; … commit;` where safe.
- **Rollbacks**: include `down.sql` where practical; for destructive changes require backup + manual confirm.
- **Zero-downtime**: add columns nullable → backfill → make NOT NULL; add new enums with `alter type … add value`.

---

## Environment Gate

| Step | Dev | Staging | Prod |
|---|---|---|---|
| Backup/PITR ready | – | ✅ | ✅ |
| Apply migration | `up` or `db reset` | `up` | `up` |
| Webhooks toggle | – | optional | pause during schema-breaking ops |
| Smoke tests | ✅ | ✅ | ✅ |
| Tag release | – | optional | required |

---

## Order of Migrations

### M0 — Core (schema foundation)
- Enable extensions (`pgcrypto`) and helpers (`set_updated_at()`).
- Enum `stage_type ('Filling','Covering','Decorating','Packing','Complete')`.
- Tables:  
  - `orders_bannos`, `orders_flourlane` (scanner-friendly `id` + surrogate `row_id uuid`, stage, priority, assignee_id, storage, **operational timestamps**, `order_json`, totals, audit columns).  
  - Triggers `updated_at`.  
  - Indexes: **queue** (incomplete), **unassigned** (assignee_id IS NULL).  
  - *(Optional)* `stage_events` for audit trail.
- Shared: `staff_shared (role, is_active)`.
- **RLS**: enable on all created tables; allow **select** to `authenticated`; no write policies.

### M1 — Settings
- Tables for printing/storage/flavour options or a simple `settings_kv` if preferred.
- Admin-only surface via RPCs (no direct writes).

### M2 — Shopify Integration
- `shop_tokens` (per store), `sync_runs` (status, started_at/finished_at, counts).
- Webhook skeleton (Edge) + HMAC secret storage.
- Minimal indexes on `sync_runs(started_at desc)`.

### M3 — Inventory / BOM
- `inventory_items (sku pk, title, uom, ats)` + `inventory_txn (sku, qty, reason, ref_id)`.
- `work_queue (topic, status, priority, payload, dedupe_key unique, retries, locks, next_retry_at)`.
- (Optional) BOM: `product_requirements (sku, component_sku, qty)`.
- Indexes: `inventory_txn(sku, created_at desc)`, `work_queue(status, priority, next_retry_at)`.

### M4 — Inventory Sync Extras
- Extend `work_queue` for robust retries/locking/dedupe if not done in M3.
- Add any missing indexes from real EXPLAIN plans.

### M5 — Workflows (RPC surface)
Create **SECURITY DEFINER** functions (no direct writes):  
- Filling: `handle_print_barcode`, `complete_filling`  
- Covering: `complete_covering`  
- Decorating: `complete_decorating`  
- Packing: `start_packing`, `complete_packing`, `qc_return_to_decorating`  
- Assignment/Storage: `assign_staff`, `set_storage`  
- Reads/util: `get_order_for_scan`, `get_queue`, `get_orders_for_dashboard`,  
  `get_unassigned_counts`, `get_unassigned_list`  
- Inventory: `deduct_on_order_create` (service-role only)

### M6 — Messaging (optional)
- `conversations`, `conversation_participants`, `messages` + indexes.

### M7 — Media / QC (optional)
- `order_photos (order_id, url, taken_at, meta)` + signed URL RPCs; storage policies.

### M8 — Time & Payroll (optional)
- `shifts`, `breaks`, summaries and reporting RPCs.

---

## Pre-Migration Checklist (prod)

- ✅ Confirm **backup/PITR** working (last snapshot < 24h).  
- ✅ Toggle **maintenance** for Edge/webhooks if breaking.  
- ✅ Verify `.env` and secrets exist in target environment.  
- ✅ Dry-run SQL on staging; capture `EXPLAIN ANALYZE` for heavy reads.  
- ✅ Merge code that is **forward compatible** with new schema.

---

## Apply & Verify

1. **Apply**
   ```bash
   npx supabase migration up
Verify

select exists(select 1 from pg_type where typname='stage_type');

Sanity selects on new columns / tables.

RPCs: call no-op paths to confirm permissions.

Post

Re-enable webhooks if paused.

Run quick smoke: ingest order → barcode print → complete Filling → Packing start/complete.

Rollback Strategy
If a migration fails mid-flight: npx supabase migration up will stop—fix SQL and re-apply.

If a release must be reverted:

git revert the app code,

if schema-breaking, run the paired down.sql; if not available, apply a compensating migration (add back dropped columns with nulls),

verify RPCs and re-enable webhooks.

Always prefer compensating forward migrations over destructive down migrations in production.

Seed Data (dev only)
Minimal staff rows, 1–2 inventory items, one fake order per store.

Use a dedicated seed_dev.sql; never run in staging/prod.

Example Sequence (first time setup)
M0_core → core tables, enum, triggers, RLS, indexes

M2_shopify → tokens/sync_runs & webhook skeleton

M3_inventory_bom → inventory + work_queue

M5_workflows → RPC surface

(optional) M6_messaging, M7_media_qc, M8_time_payroll

Tag release when staging is green:

bash
Copy code
git tag v0.1.0 && git push --tags
Notes
Keep RPCs the only write path.

Don’t add “pending/in_progress” tables—assignment is assignee_id IS NULL.

Update indexes based on real queries; revisit after load tests.