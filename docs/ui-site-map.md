# UI Site Map

Routes and primary screens for the Ordak app.  
Stage model: **Filling → Covering → Decorating → Packing → Complete**.  
“Unassigned” is **not a stage** — it’s `assignee_id IS NULL` for the current stage.

---

## Route Tree (proposed)

```text
/                                  — Landing → redirects to /dashboard
/dashboard                         — Cross-store view (today/this week glance)

/queue                             — Store picker or last-used store
/queue/bannos                      — Bannos operational queue (this week)
/queue/flourlane                   — Flourlane operational queue (this week)

# Unassigned drilldowns (fast filters; same table component)
/unassigned/bannos/filling
/unassigned/bannos/covering
/unassigned/bannos/decorating
/unassigned/bannos/packing

/unassigned/flourlane/filling
/unassigned/flourlane/covering
/unassigned/flourlane/decorating
/unassigned/flourlane/packing

# Order detail (read + actions via RPCs)
/orders/:id                        — e.g., /orders/bannos-12345

# Scanner-first screens
/scanner                           — barcode/QR scanner (auto-resolve to order + stage buttons)
/scanner/packing                   — packing mode (start/complete-only UI)

/reports                           — (optional) basic counts, throughput, backlog

# Admin / Settings (gated)
/admin/settings                    — flavours, storage, printing
/admin/inventory                   — items, adjustments, reconciliation (admin-only)
/admin/staff                       — staff list & activation

# Ops / Health (gated)
/ops/health                        — edge/API health + DB ping
/ops/logs                          — recent errors/warnings (if exposed)
Screen Blocks
Queue (per store)
Single orders table with stage-aware actions:

Filling: Print barcode → handle_print_barcode, Complete → complete_filling

Covering: Complete → complete_covering

Decorating: Complete → complete_decorating

Packing: Start → start_packing, Complete → complete_packing, QC Return → qc_return_to_decorating

Quick filters: Unassigned, Today, This Week

Sort: priority DESC, due_date ASC, size ASC, order_number ASC

Columns: id, product, flavour, due_date, priority, assignee, storage, timestamps (stage-relevant)

Unassigned views
List where assignee_id IS NULL for each stage

Actions: Assign staff, open order detail, jump to scanner

Order detail
Read-only core fields + stage-specific actions (via RPCs)

Timestamps panel (filling_start/complete, etc.)

Assign staff, set storage

Audit snippet (optional stage_events if enabled)

Scanner
Live camera view; accepts bannos-#####, flour-lane-#####, or QR payload

Resolves via get_order_for_scan

Shows only the valid buttons for current stage

Success toast + optional haptic/sound feedback

Dashboard
High-level cards:

Unassigned counts per stage per store

Worker backlog (pending, oldest age)

Today’s orders by stage

Shortcuts to common actions (scanner, queue per store)

Admin / Settings (gated)
Flavours / storage options

Inventory (if exposed in UI)

Staff activation / roles

Navigation Patterns
Store scoping: keep the last-used store in local state; default /queue/<store>

Deep links: every order action should be linkable (copy URL from detail)

Back/forward: preserve filters and pagination via query params (?stage=Filling&unassigned=1)

Empty states: clear guidance to scan or assign

Permissions (at a glance)
Worker: scan actions, view queue, assign self

Supervisor: assign any staff, print barcodes, all stage completes

Admin: all above + Admin/Settings & Ops screens

(Exact checks enforced in RPCs; UI mirrors capability for clarity.)

Components (key)
/components

OrdersTable (virtualized list, row renderer)
/components/stage

FillingActions | CoveringActions | DecoratingActions | PackingActions

AssignStaffDialog, SetStorageDialog
/components/scanner

BarcodeScanner, ScanResultCard
/components/admin

FlavourList, StorageList, StaffTable, InventoryTable

RPCs used per screen (summary)
Queue & Dashboard: get_queue, get_orders_for_dashboard, get_unassigned_counts

Unassigned: get_unassigned_list, assign_staff

Order detail: get_order_for_scan (resolve by id too), assignment/storage RPCs, stage RPCs

Scanner: get_order_for_scan + stage RPCs

Admin: inventory/settings/staff RPCs (admin-only)

Notes
Keep one orders table component; change only the available actions by stage.

Don’t introduce extra “pending/in_progress” states — stage is the single source of truth; assignment is separate.

Ensure idempotency UI: re-clicks/re-scans should not duplicate actions (RPC already protects that).