# Master Task
# Master Task List - Ordak Production System

**Current Version:** v0.8.0-beta (~85% complete)  
**Target:** v1.0.0 Production Ready  
**Last Updated:** 2025-01-15

## ✅ COMPLETED (Based on CHANGELOG v0.1.0 - v0.9.0)

### Phase 1: Foundation & Database ✅ COMPLETE (v0.3.0-beta)
- ✅ All 50+ RPC functions implemented
- ✅ Database schema complete with orders_bannos/orders_flourlane
- ✅ Authentication system locked (v0.8.0-beta)
- ✅ SECURITY DEFINER RPCs active
- ⚠️ RLS policies: Basic in place, full hardening deferred to end

### Phase 2: Core Queue & Order Management ✅ COMPLETE (v0.4.0-beta)
- ✅ Queue system RPCs operational
- ✅ Stage-specific RPCs implemented
- ✅ Scanner system (barcode lookup) working
- ✅ Staff workspace connected to real data

### Phase 3: Staff Management ✅ COMPLETE (v0.5.0-beta)
- ✅ Time tracking RPCs implemented
- ✅ Barcode printing system operational
- ✅ Scanner hardware integration complete

### Phase 4: Inventory & BOM ⚠️ 80% COMPLETE
- ✅ Component management RPCs implemented
- ✅ BOM system RPCs created
- ✅ Stock management RPCs operational
- ✅ Settings management RPCs working
- ❌ UI Integration incomplete (5 inventory tabs need connecting)
- ❌ Mock order data needs removal before webhooks

### Phase 6: UI Integration ✅ 85% COMPLETE (v0.6.0-beta, v0.7.0-beta)
- ✅ Most UI connected to RPCs (v0.4.0-beta)
- ✅ Real-time updates working (v0.7.0-beta messaging)
- ✅ Single URL architecture implemented (v0.6.0-beta)
- ❌ 5 inventory tabs need finishing
- ❌ Mock order data cleanup needed

## 🔄 IN PROGRESS
- Inventory UI completion (5 tabs remaining)
- Documentation consolidation

## ❌ NOT STARTED - CRITICAL

### Phase 5: Shopify Integration & Webhooks 🚧 IN PROGRESS (~90%)

- ✅ Edge Function `shopify-webhooks` (HMAC verify, per-store idempotency)
- ✅ `processed_webhooks` + `dead_letter` wired with consistent statuses (`ok|rejected|error`)
- ✅ RPC `enqueue_order_split` → `work_queue(topic,payload,status)`
- ✅ Worker #1: `process_webhook_order_split` → emits `kitchen_task_create` (A–Z, AA…, accessories on A)
- ✅ Worker #2: `process_kitchen_task_create` → creates `stage_events` (Filling_pending) with deterministic UUID per order
- ✅ Queue & stage schemas hardened; unique keys & NOT NULL enforced; preview-safe migrations

**Next (finalizing Phase 5):**
- 🔜 Connect Shopify webhooks for **Bannos** and **Flourlane** (when switching to ordak.com.au).
- 🔜 Quick live smoke: see rows in `processed_webhooks` → `work_queue` → `stage_events`.
- (Optional) Add a read-only admin monitor for `processed_webhooks / work_queue / dead_letter`.

**Go/No-Go checklist:**
- Supabase secrets set: `SHOPIFY_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`
- Functions deployed: `shopify-webhooks`, `queue-worker`
- Sanity curl: `queue-worker?task=split` and `?task=kitchen` return `{"ok":true,"processed":0}`

### Phase 7: Production Deployment ⚠️ SIMPLIFIED APPROACH
- ❌ Mobile testing needed (production floor uses tablets)
- ❌ E2E testing needed (prevent regressions)
- ✅ No staging environment (test with real orders in production)
- ✅ RLS hardening deferred to end (basic policies in place)
- ❌ Final production checklist needed

## 📋 REMAINING WORK BY PRIORITY

### PRIORITY 1: CRITICAL FOR PRODUCTION (Must Complete in Order)

#### Task 1: Clean Mock Order Data ✅ COMPLETE (v0.9.0-beta)
- ✅ Removed all fake/test orders from database
- ✅ Verified clean state: 0 rows in `orders_bannos`, `orders_flourlane`, `inventory_txn`
- ✅ Analytics UI refactored with live-empty states
- **Completed:** 2025-10-21 (PR #117)

#### Task 2: Complete Inventory UI - BOMsInventory.tsx
- Connect to get_boms() RPC
- Test in app
- **Workflow:** ONE PR, merge to dev

#### Task 3: Complete Inventory UI - AccessoryKeywords.tsx
- Connect to get_accessory_keywords() RPC
- Test in app
- **Workflow:** ONE PR, merge to dev

#### Task 4: Complete Inventory UI - ProductRequirements.tsx
- Connect to get_product_requirements() RPC
- Test in app
- **Workflow:** ONE PR, merge to dev

#### Task 5: Complete Inventory UI - TransactionsInventory.tsx
- Connect to get_stock_transactions() RPC
- Test in app
- **Workflow:** ONE PR, merge to dev

#### Task 6: Complete Inventory UI - ToolsInventory.tsx
- Connect restock and adjust buttons
- Test in app
- **Workflow:** ONE PR, merge to dev

#### Task 7: Implement Shopify Webhooks - Create Edge Functions
- Create supabase/functions/orders_create_bannos/
- Create supabase/functions/orders_create_flourlane/
- HMAC verification
- Test with Shopify test webhooks
- **Workflow:** ONE PR, merge to dev

#### Task 8: Implement Shopify Webhooks - Order Ingestion
- Connect webhooks to ingest_order() RPC
- Test order flow end-to-end
- **Workflow:** ONE PR, merge to dev

#### Task 9: Mobile Testing & Responsiveness
- Test all components on tablets
- Fix any mobile issues
- **Workflow:** ONE PR per fix, merge to dev

#### Task 10: E2E Test Suite
- Create basic E2E tests for critical flows
- **Workflow:** ONE PR, merge to dev

### PRIORITY 2: FINAL HARDENING (After Core Complete)

#### Task 11: RLS Policy Hardening
- Implement full RLS policies on all tables
- Test security with different roles
- **Workflow:** ONE PR, merge to dev

#### Task 12: Performance Monitoring
- Add basic performance tracking
- **Workflow:** ONE PR, merge to dev

#### Task 13: Production Checklist
- Document go-live procedures
- **Workflow:** ONE PR, merge to dev

## AFTER ALL TASKS: Test with Real Orders
- Process first real Shopify order
- Verify complete flow works
- Fix any issues one at a time

## 🔄 WORKFLOW PROCESS

**ONE TASK AT A TIME - Small Steps:**

1. Pick next task from MASTER_TASKS.md
2. Create feature branch from dev
3. Implement the task
4. Test in local app (verify it works)
5. Create PR to merge with dev
6. User reviews PR and checks all tests pass
7. Squash and merge to dev
8. Update BOTH files:
   - CHANGELOG.md (add entry with commit SHA)
   - MASTER_TASKS.md (mark task complete)
9. Move to next task

**No Staging Environment:**
- Test directly with real orders after all tasks complete
- One-by-one verification in production
- Small incremental changes reduce risk

## 📊 COMPLETION STATUS

- **Phase 1 (Foundation):** ✅ 100% Complete
- **Phase 2 (Queue/Orders):** ✅ 100% Complete  
- **Phase 3 (Staff Management):** ✅ 100% Complete
- **Phase 4 (Inventory):** ⚠️ 80% Complete (UI integration needed)
- **Phase 5 (Webhooks):** 🚧 85% Complete (Workers done, webhook registration next)
- **Phase 6 (UI Integration):** ✅ 85% Complete (Inventory tabs needed)
- **Phase 7 (Production):** ⚠️ Simplified approach (RLS deferred)

**Overall Progress:** ~85% Complete

## 🎯 NEXT IMMEDIATE TASK

**Task 1: Clean Mock Order Data**
- Remove all fake/test orders from database
- Verify clean state before webhooks
- This must be done before webhook implementation

---

*This file is the single source of truth for all remaining work. Every completed task must be marked here and added to CHANGELOG.md with evidence.*

---

## ✅ Phase 3: Analytics UI Refactor & Cleanup (v0.9.0-beta)
**Goal:** Remove mock data, unify KPI and chart rendering, and prepare UI for live data integration.

### Completed Work
- Refactored Staff, Bannos, and Flourlane analytics pages:
  - Removed hardcoded mock data and replaced with empty-state logic.
  - Added `AnalyticsKPI`, `KpiValue`, `ChartContainer` shared components.
  - Added `useAnalyticsEnabled()` hook + `flags.ts` toggle.
  - Unified chart container pattern (one `ResponsiveContainer` per chart).
  - Resolved all CI and build issues flagged by Bot and CodeRabbit.
- Verified full build success and deployment (Supabase Preview + Vercel).
- Confirmed UI consistency across all analytics pages.

### Verification
- **All Orders Cleared:** 0 rows in `orders_bannos`, `orders_flourlane`, `inventory_txn`.
- **UI:** Analytics pages show clean empty states.
- **Deployment:** Vercel, Supabase Preview, and CI all green.

---

## ▶️ Next Phase (v1.0.0-RC)
- **Task 7 – Webhook Ingestion Setup (Edge Function + HMAC Verify)**
  - Create `shopify-webhooks` Edge Function.
  - Implement HMAC validation and idempotency via `processed_webhooks` table.
  - Extend `dead_letter` for webhook error logging.
  - Prepare test scripts for local HMAC verification.

---

🧠 Summary of project status after merge
Area	Status	Notes
Orders system	✅ Clean and verified	All tables empty, confirmed synced with UI
Analytics UI	✅ Fully refactored	Using live components; ready for future metrics ingestion
Inventory module	⏸ Deferred	Will resume after webhooks
Webhook ingestion (next)	🚀 Ready to start	Baseline migration + Edge Function planned


<!-- Content to be added by Panos -->
