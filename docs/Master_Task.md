# Master Task
# Master Task List - Ordak Production System

**Current Version:** v0.9.6-beta (~95% complete)  
**Target:** v1.0.0 Production Ready  
**Last Updated:** 2025-11-02

## ✅ COMPLETED PHASES

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

### Phase 4: Inventory & BOMs ✅ 100% COMPLETE (v0.9.4-beta)
- ✅ Table bootstrap guards added for components / boms / bom_components / accessory_keywords / product_requirements  
- ✅ Read-side RPCs implemented (get_components, get_boms, get_accessory_keywords, get_product_requirements, get_stock_transactions)  
- ✅ Write-side SECURITY DEFINER wrappers implemented (tx_component_adjust / receive / consume / reserve / release)  
- ✅ Integrated successfully with existing UI — all five inventory tabs now live-connected  
- ✅ All Supabase Preview / CI checks passing  
- ✅ No mock data required  

### Phase 5: Shopify Integration & Webhooks ✅ 100% COMPLETE (v0.9.6-beta)
- ✅ Edge Function `shopify-webhooks` infrastructure deployed and responding
- ✅ Full HMAC verification logic restored and production-ready
- ✅ `processed_webhooks` + `dead_letter` tables with consistent statuses (`ok|rejected|error`)
- ✅ RPC `enqueue_order_split` → `work_queue(topic,payload,status)`
- ✅ Worker #1: `process_webhook_order_split` → emits `kitchen_task_create`
- ✅ Worker #2: `process_kitchen_task_create` → creates `stage_events`
- ✅ Complete order ingestion pipeline with kitchen-docket parity
- ✅ Order-level idempotency (race-condition safe)
- ✅ Stock deduction integration with full error logging
- ✅ Security hardening (authenticated domain routing, exact matching)
- ✅ Complete observability (audit trails, dead_letter logging)
- ✅ Shopify webhooks connected for **Bannos** and **Flourlane**
- ✅ Production smoke tested: rows flow through `processed_webhooks` → `work_queue` → `stage_events`

### Phase 6: UI Integration ✅ 100% COMPLETE (v0.6.0-beta, v0.7.0-beta, v0.9.4-beta)
- ✅ All UI connected to RPCs
- ✅ Real-time updates working (v0.7.0-beta messaging)
- ✅ Single URL architecture implemented (v0.6.0-beta)
- ✅ All 5 inventory tabs completed (v0.9.4-beta)
- ✅ Mock order data cleaned (v0.9.0-beta)

---

## 📊 COMPLETION STATUS

- **Phase 1 (Foundation):** ✅ 100% Complete
- **Phase 2 (Queue/Orders):** ✅ 100% Complete  
- **Phase 3 (Staff Management):** ✅ 100% Complete
- **Phase 4 (Inventory):** ✅ 100% Complete
- **Phase 5 (Webhooks):** ✅ 100% Complete
- **Phase 6 (UI Integration):** ✅ 100% Complete
- **Phase 7 (Production Readiness):** ⚠️ 0% Complete (not started)

**Overall Progress:** ~95% Complete

---

## 📋 WHAT'S LEFT TO DO

### ✅ COMPLETED TASKS (v0.9.0 - v0.9.6)
- ✅ **Task 1:** Clean Mock Order Data (v0.9.0-beta, PR #117)
- ✅ **Tasks 2-6:** Complete Inventory UI (All 5 tabs connected, v0.9.4-beta)
- ✅ **Task 7:** Shopify Edge Functions (v0.9.2-beta)
- ✅ **Task 7a:** Fix Shopify Webhooks Boot Error (v0.9.5-beta, PR #157)
  - Resolved 503 errors in `shopify-webhooks` Edge Function
  - Deployed minimal working version as temporary fix
  - Full logic successfully restored in Task 7b
- ✅ **Task 7b:** Complete Webhook Order Ingestion Pipeline (v0.9.6-beta, PR #160) **COMPLETED 2025-11-02**
  - Implemented full order ingestion pipeline with kitchen-docket parity
  - Added order-level idempotency (race-condition safe)
  - Integrated stock deduction with error logging
  - Applied security hardening (authenticated domain routing)
  - Implemented complete observability (audit trails, dead_letter)
  - Fixed 8 critical bugs identified during development
- ✅ **Task 8:** Shopify Webhooks Connected (COMPLETED)
  - Webhook URLs registered in Shopify admin for both stores (Bannos + Flourlane)
  - Supabase secrets configured
  - Webhooks actively sending data to Edge Function
  - End-to-end flow verified: webhooks → processed_webhooks → work_queue → stage_events

### 🔜 PRIORITY 1: PRODUCTION READINESS (Must Complete Before Go-Live)

#### Task 9: Mobile Testing & Responsiveness 🔴 CRITICAL
**Status:** NOT STARTED  
**Priority:** HIGHEST (production floor uses tablets)  
**Effort:** ~1-2 days

**What to Test:**
- All screens on tablets (iPad, Android tablets)
- Queue management interface (main production view)
- Scanner workflow (barcode scanning, stage progression)
- Staff workspace (order assignment, stage completion)
- Inventory tabs (components, BOMs, transactions, tools)
- Touch interactions (tap targets, swipe gestures)
- Keyboard/input on mobile (search, notes, qty entry)

**Expected Issues:**
- Layout breaks on smaller screens
- Touch targets too small
- Modals/drawers not mobile-friendly
- Tables not responsive (need horizontal scroll or card layout)

**Workflow:** ONE PR per fix, merge to dev

---

#### Task 10: E2E Test Suite
**Status:** NOT STARTED  
**Priority:** HIGH (prevent regressions)  
**Effort:** ~2-3 days

**Critical Flows to Test:**
1. **Webhook → Queue → Completion:**
   - Webhook arrives → `processed_webhooks` → `work_queue` → `stage_events`
   - Order appears in queue
   - Staff assigns order
   - Progress through stages (Filling → Covering → Decorating → Packing → Complete)
   
2. **Scanner Workflow:**
   - Print barcode
   - Scan to start stage
   - Complete stage via scanner

3. **Inventory Operations:**
   - Receive stock (tx_component_receive)
   - Consume stock (tx_component_consume)
   - View transactions (get_stock_transactions)
   - Check low stock alerts

4. **Staff Management:**
   - Clock in/out
   - Break tracking
   - Order assignment

**Tools:** Playwright (already configured in `playwright.config.ts`)

**Workflow:** ONE PR, merge to dev

---

#### Task 11: RLS Policy Hardening
**Status:** NOT STARTED  
**Priority:** MEDIUM (basic policies already in place)  
**Effort:** ~1-2 days

**What to Implement:**
- Full RLS policies on all tables
- Verify staff can't access admin functions
- Verify staff can only see their assigned orders
- Test with different roles (Staff, Supervisor, Admin)
- Document RLS strategy

**Workflow:** ONE PR, merge to dev

---

#### Task 12: Performance Monitoring
**Status:** NOT STARTED  
**Priority:** MEDIUM  
**Effort:** ~1 day

**What to Add:**
- Basic performance tracking (page load times, RPC query times)
- Slow query alerts (> 2s)
- Error rate monitoring
- Queue depth monitoring (alert if > 50 pending orders)

**Workflow:** ONE PR, merge to dev

---

#### Task 13: Production Checklist & Documentation
**Status:** NOT STARTED  
**Priority:** MEDIUM  
**Effort:** ~0.5 day

**What to Document:**
- Go-live procedures (step-by-step)
- Rollback plan (if things go wrong)
- Support contacts & emergency procedures
- Known limitations & workarounds
- First-day monitoring plan

**Workflow:** ONE PR, merge to dev

---

## 🎯 RECOMMENDED PLAN

### **Phase 1: Finalize Webhooks (when domain ready)**
**Timeline:** 1 hour (configuration only)
1. Complete Task 8 (Connect Shopify webhooks)
2. Test with 1-2 real orders
3. Monitor for 24 hours

### **Phase 2: Production Hardening (before go-live)**
**Timeline:** 5-7 days
1. **Task 9: Mobile Testing** (1-2 days) - 🔴 HIGHEST PRIORITY
   - Test on tablets first (production floor devices)
   - Fix critical layout/UX issues
2. **Task 10: E2E Tests** (2-3 days)
   - Critical flow coverage
   - Prevent regressions
3. **Task 11: RLS Hardening** (1-2 days)
   - Security audit
   - Role-based access verification
4. **Task 12: Performance Monitoring** (1 day)
   - Observability setup
5. **Task 13: Production Checklist** (0.5 day)
   - Documentation
   - Go-live procedures

### **Phase 3: Go-Live**
1. Deploy to production
2. Process first real orders with supervision
3. Monitor closely for first week
4. Fix issues one at a time (small PRs)

---

## 🔄 WORKFLOW PROCESS

**ONE TASK AT A TIME - Small Steps:**

1. Pick next task from this file
2. Create feature branch from dev
3. Implement the task
4. Test in local app (verify it works)
5. Create PR to merge with dev
6. Panos reviews PR and checks all tests pass
7. Squash and merge to dev
8. Update BOTH files:
   - CHANGELOG.md (add entry with commit SHA)
   - Master_Task.md (mark task complete)
9. Move to next task

**Key Principles:**
- One small task per PR (~50 lines or one concern)
- All DB writes through SECURITY DEFINER RPCs
- No secrets/keys in code
- Test locally before PR
- No direct push to dev or main

---

## 📌 NEXT IMMEDIATE ACTIONS

### **If Domain Ready:**
→ **Task 8:** Connect Shopify webhooks (1 hour)

### **If Waiting for Domain:**
→ **Task 9:** Mobile Testing & Responsiveness (START NOW - most critical)
   - Production floor uses tablets
   - Likely to find multiple issues
   - Will take 1-2 days to fix

---

*This file is the single source of truth for all remaining work. Every completed task must be marked here and added to CHANGELOG.md with evidence.*

---

## 📚 ARCHIVED SECTIONS (Historical Reference)

<details>
<summary>Click to expand historical sections (2025-01 to 2025-10)</summary>

### ✅ Phase 3: Analytics UI Refactor & Cleanup (v0.9.0-beta)
**Goal:** Remove mock data, unify KPI and chart rendering, and prepare UI for live data integration.

**Completed Work:**
- Refactored Staff, Bannos, and Flourlane analytics pages
- Removed hardcoded mock data and replaced with empty-state logic
- Added `AnalyticsKPI`, `KpiValue`, `ChartContainer` shared components
- Added `useAnalyticsEnabled()` hook + `flags.ts` toggle
- Unified chart container pattern (one `ResponsiveContainer` per chart)
- Resolved all CI and build issues flagged by Bot and CodeRabbit
- Verified full build success and deployment (Supabase Preview + Vercel)
- Confirmed UI consistency across all analytics pages

**Verification:**
- All Orders Cleared: 0 rows in `orders_bannos`, `orders_flourlane`, `inventory_txn`
- UI: Analytics pages show clean empty states
- Deployment: Vercel, Supabase Preview, and CI all green

</details>
