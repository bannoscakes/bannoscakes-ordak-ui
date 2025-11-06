# Database Audit Report - November 6, 2025

**Status:** 🚨 CRITICAL ISSUES FOUND  
**Auditor:** AI Assistant  
**Date:** 2025-11-06

---

## 🚨 CRITICAL FINDINGS

### 1. **50+ RPC Functions NOT in Version Control**

**Severity:** 🔴 CRITICAL  
**Impact:** HIGH - System cannot be reproduced in fresh environments

**Details:**
- According to `CHANGELOG.md` v0.3.0-beta (2025-10-01), **50+ RPC functions** were implemented across 9 phases
- These RPCs were documented as being in files: `supabase/sql/005_*.sql` through `supabase/sql/013_*.sql`
- **NONE of these files exist in the repository**
- All RPCs were applied directly to production database without being committed to git

**Missing RPC Files:**
- `supabase/sql/005_database_infrastructure.sql` - Helper functions, tables
- `supabase/sql/006_staff_management_rpcs.sql` - Staff & shift management
- `supabase/sql/007_order_management_rpcs.sql` - Order operations
- `supabase/sql/008_queue_management_rpcs.sql` - **get_queue, get_queue_stats, assign_staff**
- `supabase/sql/009_scanner_stage_rpcs.sql` - Scanner & stage lifecycle
- `supabase/sql/010_inventory_management_rpcs.sql` - Inventory tracking
- `supabase/sql/011_settings_management_rpcs.sql` - Settings management
- `supabase/sql/012_complete_grid_order_rpcs.sql` - Complete orders grid
- `supabase/sql/013_final_rpcs.sql` - Final RPCs and placeholders

**Critical Missing RPCs:**
- `get_queue()` - Main queue function used throughout the app
- `get_queue_stats()` - Queue statistics
- `get_unassigned_counts()` - Unassigned order counts
- `assign_staff()` / `unassign_staff()` - Staff assignment
- `move_to_next_stage()` / `move_to_stage()` - Stage progression
- `complete_filling()` / `complete_covering()` / `complete_decorating()` - Stage completion
- `start_packing()` / `complete_packing()` - Packing workflow
- `handle_print_barcode()` - Barcode printing
- `get_order_for_scan()` - Scanner lookup
- `get_components()` - Inventory components
- `get_boms()` - Bill of materials
- `get_settings()` / `set_setting()` - Settings management
- `get_flavours()` / `set_flavours()` - Flavour management
- `get_storage_locations()` / `set_storage_locations()` - Storage management
- And 35+ more...

**Consequences:**
1. ❌ Cannot spin up fresh development environments
2. ❌ Cannot deploy to new Supabase projects
3. ❌ Cannot reproduce production database
4. ❌ Preview environments (Vercel, Supabase) will fail
5. ❌ Disaster recovery impossible without manual intervention
6. ❌ No audit trail of RPC changes
7. ❌ Team members cannot work independently

---

### 2. **Migration Files in Wrong Location**

**Severity:** 🟡 MEDIUM  
**Impact:** MEDIUM - Confusion about migration strategy

**Details:**
- Migration files exist in `supabase/migrations/` (correct location)
- Additional SQL files exist in `supabase/sql/` (not auto-applied)
- Root directory has many `.sql` test/debug files (should be in `scripts/` or deleted)

**Current Migration Files (supabase/migrations/):**
```
020_orders_full_wipe.sql
022_webhook_baseline.sql
023_webhook_enqueue.sql
024_work_queue_align.sql
025_work_queue_reconcile.sql
026_order_split_worker.sql
027_stage_ticket_worker.sql
028_stage_events_align.sql
029_stage_events_align_fix.sql
030_stage_events_consolidate.sql
031_stage_events_preview_fix.sql
032_stage_events_uuid_guard.sql
033_stage_ticket_worker_uuid_fix.sql
034_inventory_read_rpcs.sql
035_inventory_write_wrappers.sql
037_make_due_date_nullable.sql
039_webhook_inbox_tables.sql
20251008214500_fix_staff_shared_dependency.sql
```

**Files in supabase/sql/ (not auto-applied):**
```
20241008_ensure_staff_shared_exists.sql
20241008_fix_messaging_system_final.sql
20250114_verify_realtime_publication.sql
20250115_inventory_txn.sql
20250115_staff_surface.sql
```

**Root directory SQL files (should be cleaned up):**
```
add_panos_new_profile.sql
apply_schema.js
apply_schema.mjs
check_clean_database.sql
check_function_exists.sql
check_get_staff_member_function.sql
check_messages_table_columns.sql
check_panos_account_simple.sql
check_panos_account_status.sql
check_rpc_functions.sql
check_staff_member_rpc.sql
clean_messaging_database.sql
clean_mock_staff_accounts.sql
complete_inventory_test_data.sql
create_get_staff_member_rpc.sql
create_panos_account.sql
create_real_user_accounts.sql
create_staff_rpc.sql
create_test_bom_data.sql
debug_panos_account.sql
drop_and_recreate_get_staff_member.sql
fix_panos_auth_account.sql
fix_panos_password_corrected.sql
fix_panos_password_final.sql
fix_staff_shared_table.sql
force_drop_get_staff_member.sql
set_panos_password_direct.sql
simple_function_test.sql
simple_panos_fix.sql
simple_test_data.sql
test_accessory_keywords_data.sql
test_authentication_flow.sql
test_bom_data.sql
test_connection.mjs
test_flavours_direct.sql
test_flavours_persistence.sql
test_flavours_simple.sql
test_flourlane_storage.sql
test_keywords_data.sql
test_messaging_debug.html
test_messaging_simple.js
test_monitor_density_complete.sql
test_monitor_functions.sql
test_product_requirements_data.sql
test_simple_messaging.sql
test_stock_transactions_data_clean.sql
test_stock_transactions_data.sql
test_storage_locations.sql
update_staff_with_real_user_ids.sql
verify_auth_setup.sql
verify_messaging_setup.sql
```

---

### 3. **Webhook Architecture Incomplete**

**Severity:** 🟡 MEDIUM  
**Impact:** MEDIUM - Stage 2 processing not implemented

**Details:**
- Current state: Webhooks store raw JSON in `webhook_inbox_bannos` and `webhook_inbox_flourlane`
- Stage 2 processor (Liquid templates + backend logic) is **NOT IMPLEMENTED**
- Historical orders in `orders_bannos` (15 orders) and `orders_flourlane` (22 orders) from early webhook testing
- These historical orders are **NOT connected** to current webhook inbox tables

**Current Tables:**
- ✅ `webhook_inbox_bannos` - Raw payload storage (created in migration 039)
- ✅ `webhook_inbox_flourlane` - Raw payload storage (created in migration 039)
- ⚠️ `orders_bannos` - Has 15 historical orders (not connected to inbox)
- ⚠️ `orders_flourlane` - Has 22 historical orders (not connected to inbox)

**Status:**
- ✅ Webhooks accepting and storing all orders
- ⏸️ Processing logic deferred to post-launch (Task 8b in Master_Task.md)
- ✅ Original splitting logic backed up in `.BACKUP-with-splitting.ts` files

---

## 📊 MIGRATION HISTORY ANALYSIS

### What's in Migrations:
- ✅ Webhook infrastructure (022-027)
- ✅ Work queue system (024-025)
- ✅ Stage events system (028-033)
- ✅ Inventory read RPCs (034)
- ✅ Inventory write wrappers (035)
- ✅ Webhook inbox tables (039)

### What's MISSING from Migrations:
- ❌ Core queue RPCs (get_queue, get_queue_stats, get_unassigned_counts)
- ❌ Order management RPCs (assign_staff, move_to_stage, update_order_*)
- ❌ Scanner RPCs (complete_filling, complete_covering, etc.)
- ❌ Settings RPCs (get_settings, set_setting, get_flavours, etc.)
- ❌ Staff management RPCs (start_shift, end_shift, get_staff_me, etc.)
- ❌ Complete grid RPCs (get_complete)
- ❌ Database infrastructure (staff_shifts, settings, audit_log tables)

---

## 🎯 RECOMMENDED ACTIONS

### **PRIORITY 1: Extract RPCs from Production Database** 🔴 URGENT

**Why:** Without these, the system cannot be reproduced or deployed elsewhere.

**Steps:**
1. Use Supabase CLI to dump all RPC function definitions from production
2. Create migration files for each RPC group (005-013 as documented)
3. Test migrations in a fresh Supabase project
4. Commit to git and create PR
5. Document extraction process

**Command to extract functions:**
```bash
# Dump all functions from production
supabase db dump --db-url "postgresql://..." --schema public --data-only=false > all_functions.sql

# Or use pg_dump directly
pg_dump -h db.xxx.supabase.co -U postgres -d postgres --schema-only --no-owner --no-privileges > schema_dump.sql
```

---

### **PRIORITY 2: Clean Up Root Directory SQL Files** 🟡 MEDIUM

**Why:** Reduces confusion, improves repository hygiene.

**Steps:**
1. Create `scripts/debug/` directory for test SQL files
2. Move all test/debug SQL files from root to `scripts/debug/`
3. Delete obsolete files (password fixes, account creation scripts)
4. Update `.gitignore` to ignore `scripts/debug/`

**Files to move:**
- All `test_*.sql` files → `scripts/debug/`
- All `check_*.sql` files → `scripts/debug/`
- All `debug_*.sql` files → `scripts/debug/`

**Files to delete (obsolete):**
- `fix_panos_password_*.sql`
- `create_panos_account.sql`
- `set_panos_password_direct.sql`
- `simple_panos_fix.sql`

---

### **PRIORITY 3: Consolidate SQL Files** 🟡 MEDIUM

**Why:** Single source of truth for database changes.

**Steps:**
1. Review files in `supabase/sql/`
2. Convert to migrations if they contain schema changes
3. Move to `scripts/` if they're one-time setup scripts
4. Delete if obsolete

**Files to review:**
- `20241008_ensure_staff_shared_exists.sql` - Should be a migration?
- `20241008_fix_messaging_system_final.sql` - Should be a migration?
- `20250114_verify_realtime_publication.sql` - One-time setup script?
- `20250115_inventory_txn.sql` - Should be a migration?
- `20250115_staff_surface.sql` - Should be a migration?

---

### **PRIORITY 4: Document Current Database State** 🟢 LOW

**Why:** Future reference and onboarding.

**Steps:**
1. Create `docs/DATABASE_STATE.md` with:
   - List of all tables
   - List of all RPCs
   - List of all migrations applied
   - Known gaps and workarounds
2. Create `docs/DATABASE_RECOVERY.md` with:
   - Steps to recreate database from scratch
   - Manual steps required (if any)
   - Verification checklist

---

## 📋 VERIFICATION CHECKLIST

Before considering database "clean":

- [ ] All RPC functions extracted from production and committed to git
- [ ] All migrations tested in fresh Supabase project
- [ ] Root directory cleaned of test SQL files
- [ ] `supabase/sql/` directory reviewed and consolidated
- [ ] Database state documented
- [ ] Recovery process documented and tested
- [ ] Preview environments working (Vercel, Supabase)
- [ ] Team can spin up local development environments

---

## 🔍 USER FINDINGS (2025-11-06)

### **Database Structure (from Schema Visualizer):**

**PART 1: MAIN SCHEMA (Connected to UI) ✅ KEEP**
- `orders_bannos` (15 orders) - Active, connected to UI
- `orders_flourlane` (22 orders) - Active, connected to UI
- `webhook_inbox_bannos` - Active (currently disconnected, will connect in Stage 2)
- `webhook_inbox_flourlane` - Active (currently disconnected, will connect in Stage 2)
- All inventory tables (components, bom_headers, bom_items, etc.)
- All system tables (staff_shared, users, messages, stage_events, etc.)
- **This is the main working database**

**PART 2: Disconnected Group 1 (6 tables) ❌ DELETE**
- Backup tables from October 21, 2025 webhook fixes
- Pattern: `*_bak_20251021_*`
- No connections to main schema
- Safe to delete

**PART 3: Disconnected Group 2 (7 tables) ❌ DELETE**
- More backup tables from webhook fixes
- Includes: `orders_bannos_bak_*`, `orders_flourlane_bak_*`, `inventory_txn_bak_*`, etc.
- No connections to main schema
- Safe to delete

**PART 4: Disconnected Group 3 (7 tables) ❌ DELETE**
- Additional backup tables from webhook fix attempts
- No connections to main schema
- Safe to delete

**Total backup tables to clean up: ~20 tables**

---

## 🔍 NEXT STEPS

### **PRIORITY 1: Clean Up Backup Tables** 🟢 QUICK WIN
**Effort:** 15 minutes  
**Risk:** Low (backup tables are isolated)

**Steps:**
1. Review `scripts/cleanup_backup_tables.sql`
2. Run SELECT query to list all backup tables
3. Verify they're all `_bak_20251021_*` pattern
4. Uncomment and run DROP statements
5. Verify cleanup with final SELECT query

**Script created:** `scripts/cleanup_backup_tables.sql`

---

### **PRIORITY 2: Extract RPCs from Production** 🔴 CRITICAL
**Effort:** 2-3 hours  
**Risk:** None (read-only operation)

**Decision:** Defer until after mobile testing (user preference)

**Steps (when ready):**
1. Create feature branch: `feat/extract-production-rpcs`
2. Use Supabase CLI to dump all RPC functions
3. Split into migration files (005-013 as documented)
4. Test in fresh Supabase project
5. Commit and create PR

---

### **PRIORITY 3: Clean Up Root Directory SQL Files** 🟡 MEDIUM
**Effort:** 30 minutes  
**Risk:** Low (just moving files)

**Decision:** Can be done anytime

**Steps:**
1. Create `scripts/debug/` directory
2. Move all test/debug SQL files from root
3. Delete obsolete password/account creation scripts
4. Update `.gitignore`

---

## 📝 NOTES

- The 15 orders in `orders_bannos` and 22 orders in `orders_flourlane` are historical data from early webhook testing (when webhooks briefly worked for 3-4 hours)
- These orders are NOT connected to the current `webhook_inbox_*` tables
- Current webhook architecture is working correctly (storing raw payloads)
- Stage 2 processing (Liquid templates) is intentionally deferred (Task 8b)

---

**End of Report**

