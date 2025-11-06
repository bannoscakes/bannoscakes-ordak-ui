# RPC Extraction Guide - Step by Step

**Branch:** `feat/extract-production-rpcs-nov-6`  
**Target:** Extract 70-73 RPC functions from production  
**Date:** 2025-11-06

---

## 📋 STEP 1: Verify Which Functions Exist

**Run this in Supabase SQL Editor:**

File: `scripts/list_target_rpcs.sql`

This will show you:
- ✅ Which of our 74 target functions exist
- ❌ Which are missing
- Complete SQL definitions for existing functions

**Expected Result:**
- ~70-73 functions should show "✅ EXISTS"
- ~1-4 functions might show "❌ MISSING" (Shopify placeholders, obsolete wrappers)

**Action:** Copy the results and save to a file (we'll need the function definitions)

---

## 📋 STEP 2: Extract Function Definitions

### **Option A: Use Supabase Dashboard (Recommended)**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the query from Step 1
3. For each function that shows "✅ EXISTS":
   - Copy the `definition` column
   - This contains the complete `CREATE OR REPLACE FUNCTION` statement
4. Save all definitions to a text file

### **Option B: Use pg_dump (If you have direct database access)**

```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection string

pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  > /tmp/schema_dump.sql

# Then filter for just functions
grep -A 500 "CREATE OR REPLACE FUNCTION" /tmp/schema_dump.sql > /tmp/functions_only.sql
```

---

## 📋 STEP 3: Organize Functions into Migration Files

Once you have all function definitions, we'll split them into these files:

### **005_database_infrastructure.sql**
**Helper functions and infrastructure:**
- `check_user_role()`
- `get_user_role()`
- Any other helper functions

### **006_staff_management_rpcs.sql**
**11 Staff RPCs:**
- `get_staff_list`
- `get_staff_me`
- `start_shift`
- `end_shift`
- `start_break`
- `end_break`
- `get_current_shift`
- `get_staff_member` (if exists)
- `upsert_staff_member` (if exists)
- `deactivate_staff_member` (if exists)
- `get_shift_history` (if exists)

### **007_order_management_rpcs.sql**
**11 Order RPCs:**
- `get_order`
- `assign_staff`
- `unassign_staff`
- `set_storage`
- `update_order_notes`
- `update_order_priority`
- `update_order_due_date`
- `update_order_core`
- `bulk_assign`
- `cancel_order`

### **008_queue_management_rpcs.sql**
**Queue RPCs:**
- `get_queue`
- `get_queue_stats`
- `get_unassigned_counts`

### **009_scanner_stage_rpcs.sql**
**8 Scanner RPCs:**
- `handle_print_barcode`
- `get_order_for_scan`
- `complete_filling`
- `complete_covering`
- `complete_decorating`
- `start_packing`
- `complete_packing`
- `qc_return_to_decorating`

### **010_inventory_management_rpcs.sql**
**14 Inventory RPCs:**
- `get_components`
- `get_component` (if exists)
- `upsert_component`
- `get_low_stock_components`
- `get_inventory_value`
- `update_component_stock`
- `bulk_update_component_stock` (if exists)
- `deactivate_component` (if exists)
- `get_boms`
- `upsert_bom`
- `get_accessory_keywords`
- `upsert_accessory_keyword`
- `get_product_requirements`
- `upsert_product_requirement`
- `get_stock_transactions`
- `restock_order`

### **011_settings_management_rpcs.sql**
**12 Settings RPCs:**
- `get_settings`
- `get_setting`
- `set_setting`
- `get_printing_settings`
- `set_printing_settings`
- `get_monitor_density`
- `set_monitor_density`
- `get_flavours`
- `set_flavours`
- `get_storage_locations`
- `set_storage_locations`
- `get_due_date_settings`
- `set_due_date_settings`

### **012_complete_grid_order_rpcs.sql**
**Complete Grid RPCs:**
- `get_complete`
- `get_complete_minimal` (if exists)

### **013_final_rpcs.sql**
**Messaging (9) + Analytics (2) + Shopify (0-3):**
- `create_conversation`
- `get_conversations`
- `get_conversation_participants`
- `send_message`
- `get_messages`
- `mark_messages_read`
- `get_unread_count`
- `add_participant`
- `remove_participant`
- `get_staff_times` (if exists)
- `get_staff_times_detail` (if exists)
- `test_storefront_token` (if exists)
- `connect_catalog` (if exists)
- `sync_shopify_orders` (if exists)

---

## 📋 STEP 4: Create Migration Files

For each migration file:

```sql
-- Migration: [Name]
-- Date: 2025-11-06
-- Purpose: [Description]
-- Extracted from production database

-- [Function 1]
CREATE OR REPLACE FUNCTION function_name(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ...
END;
$$;

-- [Function 2]
CREATE OR REPLACE FUNCTION function_name2(...)
...
```

---

## 📋 STEP 5: Test Migrations

### **Local Testing (if Docker available):**
```bash
# Start local Supabase
supabase start

# Apply existing migrations
supabase db reset

# Apply new RPC migrations
supabase db push

# Verify functions exist
supabase db execute --file scripts/list_target_rpcs.sql
```

### **Remote Testing (Supabase Preview):**
1. Push branch to GitHub
2. Supabase will create preview environment
3. Check if all functions are created
4. Verify no errors in logs

---

## 📋 STEP 6: Commit and Create PR

```bash
# Add all migration files
git add supabase/migrations/005_*.sql
git add supabase/migrations/006_*.sql
git add supabase/migrations/007_*.sql
git add supabase/migrations/008_*.sql
git add supabase/migrations/009_*.sql
git add supabase/migrations/010_*.sql
git add supabase/migrations/011_*.sql
git add supabase/migrations/012_*.sql
git add supabase/migrations/013_*.sql

# Add documentation
git add RPC_EXTRACTION_PLAN_FINAL.md
git add RPC_EXTRACTION_GUIDE.md
git add scripts/list_target_rpcs.sql
git add scripts/extract_all_rpcs.sql

# Commit
git commit -m "feat: extract 70+ RPC functions from production

- Extract all actively used RPCs (60 functions)
- Extract unfinished work RPCs (10 functions)
- Extract Shopify RPCs if they exist (0-3 functions)
- Organize into 9 migration files (005-013)
- Add extraction scripts and documentation
- Total: 70-73 RPC functions now in version control"

# Push
git push origin feat/extract-production-rpcs-nov-6
```

---

## 📋 STEP 7: Create PR

**PR Title:** `feat: extract 70+ RPC functions from production`

**PR Description:**

```markdown
## What / Why

Extract all RPC functions from production database and commit to version control.

**Problem:** 70+ RPC functions exist in production but are not in git, making it impossible to:
- Reproduce production database
- Deploy to new environments
- Recover from disasters
- Onboard new team members

**Solution:** Extract all functions and organize into migration files (005-013)

## Functions Extracted

- ✅ 60 actively used functions
- ✅ 10 unfinished work functions (staff, inventory, analytics)
- ✅ 0-3 Shopify functions (if they exist)
- **Total: 70-73 functions**

## Migration Files Created

- `005_database_infrastructure.sql` - Helper functions
- `006_staff_management_rpcs.sql` - 11 staff RPCs
- `007_order_management_rpcs.sql` - 11 order RPCs
- `008_queue_management_rpcs.sql` - Queue RPCs
- `009_scanner_stage_rpcs.sql` - 8 scanner RPCs
- `010_inventory_management_rpcs.sql` - 14 inventory RPCs
- `011_settings_management_rpcs.sql` - 12 settings RPCs
- `012_complete_grid_order_rpcs.sql` - Complete grid RPCs
- `013_final_rpcs.sql` - Messaging, analytics, Shopify RPCs

## How to Verify

1. Check Supabase Preview environment
2. Verify all functions are created
3. Run `scripts/list_target_rpcs.sql` to verify count
4. Check that all functions show "✅ EXISTS"

## Checklist

- [ ] All migration files created
- [ ] Functions organized by category
- [ ] Documentation updated
- [ ] Extraction scripts included
- [ ] No secrets/keys leaked
- [ ] Ready for review
```

---

## 🚨 IMPORTANT NOTES

1. **Do NOT modify function logic** - Extract as-is from production
2. **Preserve SECURITY DEFINER** - All RPCs should have this
3. **Keep comments** - Include any existing comments in functions
4. **Test thoroughly** - Verify in preview environment before merging

---

## ✅ SUCCESS CRITERIA

- [ ] 70-73 functions extracted
- [ ] All organized into 9 migration files
- [ ] All migrations pass in preview environment
- [ ] Documentation complete
- [ ] PR created and passing all checks
- [ ] Ready for Panos to review and squash & merge

---

**End of Guide**

