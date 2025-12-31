# Order Flow, Timestamps, Barcode & Scanner - Review Checklist

**Created**: 2025-12-09
**Purpose**: Comprehensive checklist to verify order flow implementation
**Status**: ✅ COMPLETE - All sections verified 2025-12-09

---

## Table of Contents

1. [Order Lifecycle & Stage Flow](#1-order-lifecycle--stage-flow)
2. [Timestamps Architecture](#2-timestamps-architecture)
3. [Barcode System](#3-barcode-system)
4. [Scanner System](#4-scanner-system)
5. [Stage Events (Audit Trail)](#5-stage-events-audit-trail)
6. [Order Intake (Webhooks)](#6-order-intake-webhooks)
7. [Inventory Deduction](#7-inventory-deduction)
8. [Migration 089 - Restore Timestamp Logic](#8-migration-089---restore-timestamp-logic)
9. [Migration 090 - Add Timestamps to get_queue RPC](#9-migration-090---add-timestamps-to-get_queue-rpc)

---

## 1. Order Lifecycle & Stage Flow

> **Verified**: 2025-12-09 ✅

### Stage Enum
- [x] Stage enum exists: `Filling | Covering | Decorating | Packing | Complete` ✅
- [x] No `_pending` or `_in_progress` substages (single enum only) ✅
- [x] "Unassigned" is NOT a stage - it's `assignee_id IS NULL` ✅

### Stage Transitions
| Transition | RPC | Verified |
|------------|-----|----------|
| → Filling (order created) | Webhook insert | ✅ |
| Filling → Covering | `complete_filling()` | ✅ |
| Covering → Decorating | `complete_covering()` | ✅ |
| Decorating → Packing | `complete_decorating()` | ✅ |
| Packing → Complete | `complete_packing()` | ✅ |
| Packing → Decorating (QC fail) | `qc_return_to_decorating()` | ✅ |

### Transition Rules
- [x] All transitions via SECURITY DEFINER RPCs only ✅
- [x] All transitions are idempotent (no duplicate events) ✅
- [x] Invalid backward transitions are blocked ✅
- [x] Every transition logs a `stage_event` ✅

---

## 2. Timestamps Architecture

> **Database Verification Date**: 2025-12-09
> **Verification Status**: ✅ Complete

### Columns Existence Check

#### orders_bannos table
| Column | Exists | Set By | Verified |
|--------|--------|--------|----------|
| `filling_start_ts` | [x] ✅ | `print_barcode()` on first print | [x] ✅ Fixed in Migration 089 |
| `filling_complete_ts` | [x] ✅ | `complete_filling()` | [x] ✅ Fixed in Migration 089 |
| `covering_start_ts` | [x] ✅ | `start_covering()` | [x] ✅ Added in Migration 089 |
| `covering_complete_ts` | [x] ✅ | `complete_covering()` | [x] ✅ Fixed in Migration 089 |
| `decorating_start_ts` | [x] ✅ | `start_decorating()` | [x] ✅ Added in Migration 089 |
| `decorating_complete_ts` | [x] ✅ | `complete_decorating()` | [x] ✅ Fixed in Migration 089 |
| `packing_start_ts` | [x] ✅ | `complete_decorating()` (auto) | [x] ✅ Fixed in Migration 089 |
| `packing_complete_ts` | [x] ✅ | `complete_packing()` | [x] ✅ Fixed in Migration 089 |
| `created_at` | [x] ✅ | Automatic on insert | [x] |
| `updated_at` | [x] ✅ | Trigger on any update | [x] |

#### orders_flourlane table
| Column | Exists | Set By | Verified |
|--------|--------|--------|----------|
| `filling_start_ts` | [x] ✅ | `print_barcode()` on first print | [x] ✅ Fixed in Migration 089 |
| `filling_complete_ts` | [x] ✅ | `complete_filling()` | [x] ✅ Fixed in Migration 089 |
| `covering_start_ts` | [x] ✅ | `start_covering()` | [x] ✅ Added in Migration 089 |
| `covering_complete_ts` | [x] ✅ | `complete_covering()` | [x] ✅ Fixed in Migration 089 |
| `decorating_start_ts` | [x] ✅ | `start_decorating()` | [x] ✅ Added in Migration 089 |
| `decorating_complete_ts` | [x] ✅ | `complete_decorating()` | [x] ✅ Fixed in Migration 089 |
| `packing_start_ts` | [x] ✅ | `complete_decorating()` (auto) | [x] ✅ Fixed in Migration 089 |
| `packing_complete_ts` | [x] ✅ | `complete_packing()` | [x] ✅ Fixed in Migration 089 |
| `created_at` | [x] ✅ | Automatic on insert | [x] |
| `updated_at` | [x] ✅ | Trigger on any update | [x] |

### Timestamp Logic Verification
- [x] ✅ `filling_start_ts` is set on FIRST barcode print only (idempotent) - **FIXED in Migration 089**
- [x] ✅ `packing_start_ts` is auto-set when `complete_decorating()` transitions to Packing - **FIXED in Migration 089**
- [x] ✅ All `*_complete_ts` timestamps use `now()` at time of RPC call - **FIXED in Migration 089**
- [x] Timestamps are never overwritten once set (idempotent)

### Summary of Timestamp Issues - RESOLVED

| Issue | Status | Resolution |
|-------|--------|------------|
| `filling_start_ts` column exists but never populated | ✅ **FIXED** | Migration 089 (PR #319) |
| `covering_start_ts` column missing | ✅ **FIXED** | Migration 089 (PR #319) |
| `decorating_start_ts` column missing | ✅ **FIXED** | Migration 089 (PR #319) |
| `start_covering()` function missing | ✅ **FIXED** | Migration 089 (PR #319) |
| `start_decorating()` function missing | ✅ **FIXED** | Migration 089 (PR #319) |
| `complete_*` functions not setting timestamps | ✅ **FIXED** | Migration 089 (PR #319) |

> **Note**: Migration 089 has been applied to the database (2025-12-09).

---

## 3. Barcode System

> **Verified**: 2025-12-09 ✅

### Barcode Generation
- [x] Uses JsBarcode library (`src/lib/barcode-service.ts`) ✅
- [x] Barcode format: Code 128 ✅
- [x] Barcode content: Order ID (e.g., `bannos-12345`) ✅

### Barcode Service Functions
| Function | Purpose | Verified |
|----------|---------|----------|
| `generateBarcodeDataUrl()` | Creates PNG data URL | ✅ |
| `generatePrintableHTML()` | Creates print-ready HTML | ✅ |
| `printBarcode()` | Opens browser print dialog | ✅ |
| `downloadBarcode()` | Downloads as PNG | ✅ |
| `handlePrintBarcode()` | Calls RPC to record print | ✅ |
| `printBarcodeWorkflow()` | Complete workflow (RPC + print) | ✅ |

### Print Barcode RPC (`print_barcode`)
- [x] RPC exists in database ✅
- [x] Accepts `p_store` and `p_order_id` parameters ✅
- [x] Returns JSON payload with order details ✅
- [x] Sets `filling_start_ts` on first print in Filling stage ✅
- [x] Logs to `stage_events` with `event_type='print'` ✅
- [x] Is idempotent (duplicate prints don't overwrite timestamp) ✅

### Printable Ticket Contains
- [x] Order number ✅
- [x] Order ID ✅
- [x] Product title ✅
- [x] Due date ✅
- [x] Customer name ✅
- [x] Stage ✅
- [x] Priority (HIGH/MEDIUM/LOW) ✅
- [x] Barcode image ✅
- [x] Store badge (Bannos/Flourlane) ✅

---

## 4. Scanner System

> **Verified**: 2025-12-09 ✅

### Scanner Components
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `ScannerOverlay.tsx` | `src/components/` | **PRIMARY** - Full-screen camera scanner for tablets | ✅ Used by Staff/Supervisor |
| `CameraScanner.tsx` | `src/components/` | Camera-based scanning component | ✅ |
| `Scanner.tsx` | `src/features/scanner/` | Legacy text input scanner | ⚠️ Not used |
| `scan-handler.ts` | `src/features/scanner/` | Legacy scan logic (stubs) | ⚠️ Not used |

### Scanner RPC Calls (ScannerOverlay - PR #320)
| Current Stage | First Scan | Second Scan | Verified |
|---------------|------------|-------------|----------|
| Filling | N/A (print sets start) | `completeFilling()` | ✅ |
| Covering | `startCovering()` | `completeCovering()` | ✅ |
| Decorating | `startDecorating()` | `completeDecorating()` | ✅ |
| Packing | N/A | `completePacking()` | ✅ |

### Stage Completion RPCs
| RPC | Exists | Stage Check | Timestamp Set | Audit Log | Verified |
|-----|--------|-------------|---------------|-----------|----------|
| `complete_filling()` | ✅ | Must be in Filling | ✅ | ✅ | ✅ |
| `complete_covering()` | ✅ | Must be in Covering | ✅ | ✅ | ✅ |
| `complete_decorating()` | ✅ | Must be in Decorating | ✅ | ✅ | ✅ |
| `complete_packing()` | ✅ | Must be in Packing | ✅ | ✅ | ✅ |

### Stage Start RPCs (PR #319)
| RPC | Exists | Sets Timestamp | Audit Log | Verified |
|-----|--------|----------------|-----------|----------|
| `start_covering()` | ✅ | `covering_start_ts` | ✅ | ✅ |
| `start_decorating()` | ✅ | `decorating_start_ts` | ✅ | ✅ |

### Scanner Error Handling
- [x] Invalid barcode shows error message ✅
- [x] Order not found shows error message ✅
- [x] Wrong stage handled by RPC exception ✅
- [x] Network errors are handled gracefully ✅

---

## 5. Stage Events (Audit Trail)

> **Verified**: 2025-12-09 ✅

### Table Structure (`stage_events`)
| Column | Type | Nullable | Verified |
|--------|------|----------|----------|
| `id` | uuid | No (PK) | ✅ |
| `store` | text | No | ✅ |
| `order_id` | text | No | ✅ |
| `stage` | text | No | ✅ |
| `event_type` | text | No | ✅ |
| `at_ts` | timestamptz | No | ✅ |
| `staff_id` | uuid | Yes | ✅ |
| `ok` | boolean | Yes | ✅ |
| `meta` | jsonb | Yes | ✅ |

### Event Types
- [x] `'assign'` - Staff assignment events ✅
- [x] `'complete'` - Stage completion events ✅
- [x] `'print'` - Barcode print events ✅
- [x] `'start'` - Stage start events ✅ (Added in Migration 089)

### Constraints
- [x] `store` CHECK: `IN ('bannos', 'flourlane')` ✅
- [x] `stage` CHECK: `IN ('Filling', 'Covering', 'Decorating', 'Packing', 'Complete')` ✅
- [x] `event_type` CHECK: `IN ('assign', 'complete', 'print', 'start')` ✅
- [x] `staff_id` REFERENCES `staff_shared(user_id)` ✅

### Indexes
- [x] `idx_stage_events_store_ts` ✅
- [x] `idx_stage_events_store_stage_ts` ✅
- [x] `idx_stage_events_staff_ts` ✅
- [x] `idx_stage_events_order` ✅

### RLS Policies
- [x] RLS enabled on table ✅
- [x] SELECT allowed for authenticated users ✅
- [x] INSERT via SECURITY DEFINER RPCs only ✅

---

## 6. Order Intake (Webhooks)

> **Verified**: Skipped - Confirmed working in production ✅

---

## 7. Inventory Deduction

> **Verified**: 2025-12-09 ✅

### Trigger Functions
| Trigger | Table | Event | Verified |
|---------|-------|-------|----------|
| `trg_deduct_inventory_bannos` | `orders_bannos` | AFTER INSERT | ✅ |
| `trg_deduct_inventory_flourlane` | `orders_flourlane` | AFTER INSERT | ✅ |
| `trg_deduct_bom_on_complete_bannos` | `orders_bannos` | AFTER UPDATE | ✅ |
| `trg_deduct_bom_on_complete_flourlane` | `orders_flourlane` | AFTER UPDATE | ✅ |

### Functions
- [x] `deduct_inventory_on_order()` exists ✅

### Tables
- [x] `stock_transactions` table exists ✅
- [x] `inventory_sync_queue` table exists ✅

---

## 8. Migration 089 - Restore Timestamp Logic

> **PR Merged**: 2025-12-09 - PR #319
> **Migration File**: `supabase/migrations/089_restore_timestamp_logic.sql`
> **Status**: ✅ **APPLIED TO DATABASE** - 2025-12-09

### What Migration 089 Fixed

#### New Columns Added
| Table | Column | Status |
|-------|--------|--------|
| `orders_bannos` | `covering_start_ts` | ✅ Added in migration |
| `orders_bannos` | `decorating_start_ts` | ✅ Added in migration |
| `orders_flourlane` | `covering_start_ts` | ✅ Added in migration |
| `orders_flourlane` | `decorating_start_ts` | ✅ Added in migration |

#### Restored Timestamp Logic in complete_* Functions
| Function | Timestamp Restored | Status |
|----------|-------------------|--------|
| `complete_filling()` | `filling_complete_ts = now()` | ✅ Fixed |
| `complete_covering()` | `covering_complete_ts = now()` | ✅ Fixed |
| `complete_decorating()` | `decorating_complete_ts = now(), packing_start_ts = now()` | ✅ Fixed |
| `complete_packing()` | `packing_complete_ts = now()` | ✅ Fixed |

#### Fixed print_barcode Function
| Change | Status |
|--------|--------|
| Uncommented `filling_start_ts` logic | ✅ Fixed |
| Now sets `filling_start_ts` on first print in Filling stage | ✅ Fixed |

#### New Functions Created
| Function | Purpose | Status |
|----------|---------|--------|
| `start_covering()` | Sets `covering_start_ts` | ✅ Created |
| `start_decorating()` | Sets `decorating_start_ts` | ✅ Created |

#### Updated stage_events CHECK Constraint
| Event Type | Status |
|------------|--------|
| `'assign'` | ✅ Allowed |
| `'complete'` | ✅ Allowed |
| `'print'` | ✅ Allowed |
| `'start'` | ✅ **NOW ALLOWED** |

### Post-Migration Verification (Run after applying)
```sql
-- Check columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders_bannos' AND column_name LIKE '%_ts';

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('start_covering', 'start_decorating');

-- Check stage_events constraint
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'stage_events_event_type_check';
```

### Remaining Action Items
- [x] Apply migration to database via Supabase Dashboard SQL Editor ✅
- [x] Run verification queries above ✅
- [x] Wire up UI to call `start_covering()` and `start_decorating()` RPCs - **PR #320**

---

## 9. Migration 090 - Add Timestamps to get_queue RPC

> **PR**: #320 (feat: wire up start_covering and start_decorating in scanner UI)
> **Migration File**: `supabase/migrations/090_add_start_timestamps_to_queue.sql`
> **Status**: ✅ **MERGED & APPLIED** - 2025-12-09

### What Migration 090 Does

Updates `get_queue` RPC to include `covering_start_ts` and `decorating_start_ts` fields so the scanner UI can determine which RPC to call.

### Frontend Changes in PR #320

| File | Change |
|------|--------|
| `src/lib/rpc-client.ts` | Added `startCovering()` and `startDecorating()` wrappers |
| `src/components/ScannerOverlay.tsx` | First-scan-starts / second-scan-completes logic |

### Scanner Behavior After PR #320

| Stage | First Scan | Second Scan |
|-------|------------|-------------|
| Filling | N/A (print_barcode sets start) | `completeFilling()` |
| Covering | `startCovering()` → sets `covering_start_ts` | `completeCovering()` |
| Decorating | `startDecorating()` → sets `decorating_start_ts` | `completeDecorating()` |
| Packing | N/A | `completePacking()` (single scan only)

---

## Summary Diagram

```
ORDER LIFECYCLE:

[Shopify] ─webhook─> [Edge Function] ─insert─> [orders_bannos/flourlane]
                                                    │
                                                    ↓ (trigger)
                                          [deduct_inventory_on_order]
                                                    │
                                                    ↓
                                          [inventory_sync_queue] → Shopify

PRODUCTION FLOOR:

[Print Barcode] ─────────────────────────────────> [filling_start_ts set]
       │                                                    │
       ↓                                                    ↓
[Barcode printed] ←──────────────────────────── [stage_events logged]
       │
       ↓
[Staff works on cake]
       │
       ↓
[Scan Barcode] ─────────────────────────────────> [complete_filling()]
       │                                                    │
       ↓                                                    ↓
[Stage: Covering] ←────────────────────────────── [filling_complete_ts set]
       │
       ↓
[Scan] → [complete_covering()] → Stage: Decorating
       │
       ↓
[Scan] → [complete_decorating()] → Stage: Packing + packing_start_ts
       │
       ↓
[Scan] → [complete_packing()] → Stage: Complete + packing_complete_ts
```

---

## Notes & Observations

1. `scan-handler.ts` and `Scanner.tsx` are legacy/unused code with stub RPCs - safe to ignore
2. `ScannerOverlay.tsx` is the primary scanner used by Staff/Supervisor on tablets
3. All timestamp logic was restored in Migration 089 after being accidentally removed in Migration 053

---

## Sign-off

| Reviewer | Date | Status |
|----------|------|--------|
| Claude + Panos | 2025-12-09 | ✅ Complete |
