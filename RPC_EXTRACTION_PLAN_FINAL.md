# RPC Extraction Plan - FINAL (November 6, 2025)

**Purpose:** Determine exactly which RPCs to extract from production  
**Status:** Ready for Extraction  
**Date:** 2025-11-06

---

## 📊 REVISED ANALYSIS

After reviewing documentation and planned features, here's the updated breakdown:

---

## ✅ CATEGORY 1: EXTRACT NOW - ACTIVELY USED (59 RPCs)

These are currently in `rpc-client.ts` and actively used by the UI:

### **Queue & Order Management** (10 RPCs)
- ✅ `getQueue()`
- ✅ `getQueueStats()`
- ✅ `getUnassignedCounts()`
- ✅ `getOrder()`
- ✅ `assignStaff()`
- ✅ `unassignStaff()`
- ✅ `setStorage()`
- ✅ `updateOrderNotes()`
- ✅ `updateOrderPriority()`
- ✅ `updateOrderDueDate()`
- ✅ `updateOrderCore()` - Used in EditOrderDrawer

### **Scanner & Stage Progression** (8 RPCs)
- ✅ `handlePrintBarcode()`
- ✅ `getOrderForScan()`
- ✅ `completeFilling()`
- ✅ `completeCovering()`
- ✅ `completeDecorating()`
- ✅ `startPacking()`
- ✅ `completePacking()`
- ✅ `qcReturnToDecorating()`

### **Inventory Management** (11 RPCs)
- ✅ `getComponents()`
- ✅ `getLowStockComponents()`
- ✅ `getInventoryValue()`
- ✅ `updateComponentStock()`
- ✅ `upsertComponent()`
- ✅ `getBoms()`
- ✅ `upsertBom()`
- ✅ `getAccessoryKeywords()`
- ✅ `upsertAccessoryKeyword()`
- ✅ `getProductRequirements()`
- ✅ `upsertProductRequirement()` - Used in ProductRequirements tab
- ✅ `getStockTransactions()` - Used in TransactionsInventory
- ✅ `restockOrder()` - Used in ToolsInventory

### **Settings Management** (12 RPCs)
- ✅ `getSettings()`
- ✅ `getSetting()`
- ✅ `setSetting()`
- ✅ `getPrintingSettings()`
- ✅ `setPrintingSettings()`
- ✅ `getMonitorDensity()`
- ✅ `setMonitorDensity()`
- ✅ `getFlavours()`
- ✅ `setFlavours()`
- ✅ `getStorageLocations()`
- ✅ `setStorageLocations()`
- ✅ `getDueDateSettings()` - Used in DueDateTest
- ✅ `setDueDateSettings()` - Planned feature

### **Staff Management** (7 RPCs)
- ✅ `getStaffList()`
- ✅ `getStaffMe()`
- ✅ `startShift()`
- ✅ `endShift()`
- ✅ `startBreak()`
- ✅ `endBreak()`
- ✅ `getCurrentShift()`

### **Messaging System** (9 RPCs)
- ✅ `createConversation()`
- ✅ `getConversations()`
- ✅ `getConversationParticipants()`
- ✅ `sendMessage()`
- ✅ `getMessages()`
- ✅ `markMessagesRead()`
- ✅ `getUnreadCount()`
- ✅ `addParticipant()`
- ✅ `removeParticipant()`

### **Admin Operations** (3 RPCs)
- ✅ `bulkAssign()` - Planned feature (bulk operations)
- ✅ `cancelOrder()` - Admin feature
- ✅ `getComplete()` - Complete orders grid

**SUBTOTAL: 60 RPCs to extract immediately**

---

## 🔄 CATEGORY 2: EXTRACT - UNFINISHED WORK (10 RPCs)

These were planned but not yet implemented in UI. **SHOULD EXTRACT** because they're part of unfinished features:

### **Staff Management - Advanced** (4 RPCs)
**Reason:** Part of staff management system, likely needed for admin features

- 🔄 `get_staff_member()` - Get individual staff details
- 🔄 `upsert_staff_member()` - Create/update staff (admin feature)
- 🔄 `deactivate_staff_member()` - Soft delete staff (admin feature)
- 🔄 `get_shift_history()` - Shift history reporting

**Status:** Planned for admin/supervisor features  
**Extract?** ✅ YES - Part of Phase 3 (Staff Management)

---

### **Inventory - Advanced** (3 RPCs)
**Reason:** Part of inventory system, likely needed for advanced features

- 🔄 `get_component()` - Get single component by ID/SKU
- 🔄 `bulk_update_component_stock()` - Bulk stock updates
- 🔄 `deactivate_component()` - Soft delete component

**Status:** Planned for inventory management  
**Extract?** ✅ YES - Part of Phase 4 (Inventory)

---

### **Analytics/Payroll** (2 RPCs)
**Reason:** Part of staff analytics system (not yet implemented)

- 🔄 `get_staff_times()` - Time tracking for payroll
- 🔄 `get_staff_times_detail()` - Detailed time reports

**Status:** Planned for Phase 10+ (Analytics)  
**Extract?** ✅ YES - Will be needed eventually

---

### **Complete Grid** (1 RPC)
**Reason:** Part of order management system

- 🔄 `get_complete_minimal()` - Simplified complete orders view

**Status:** May be used as optimization  
**Extract?** ✅ YES - Part of Phase 6 (Complete Grid)

**SUBTOTAL: 10 RPCs (unfinished work)**

---

## ⚠️ CATEGORY 3: MAYBE EXTRACT - SHOPIFY INTEGRATION (3 RPCs)

**According to docs:** These are marked as "placeholders" in CHANGELOG  
**BUT:** `rpc-surface.md` and `SUPABASE_RPC_IMPLEMENTATION_PLAN.md` show they were **planned for Phase 8**

### **Shopify Integration** (3 RPCs)
- ⚠️ `test_storefront_token()` - Test Shopify API connection
- ⚠️ `connect_catalog()` - Connect product catalog
- ⚠️ `sync_shopify_orders()` - Manual order sync from Shopify

**Current Status:**
- Webhooks handle automatic order ingestion ✅
- These would be for **manual sync** and **catalog management**
- Documented in Phase 8: "Enhanced Shopify Integration"

**User's Question:** "shopify integration we might need it or is work we never finish"

**My Recommendation:** 
- ⚠️ **EXTRACT IF THEY EXIST** - They're part of planned Phase 8
- If they don't exist in production → Skip (truly placeholders)
- If they exist → Extract (unfinished work worth preserving)

**SUBTOTAL: 0-3 RPCs (depending on if they exist)**

---

## ❌ CATEGORY 4: SKIP - TRUE OBSOLETES (11 RPCs)

These are **compatibility wrappers** or **replaced functions** - safe to skip:

### **Replaced by Specific Functions** (6 RPCs)
- ❌ `move_to_next_stage()` → Replaced by `completeFilling()`, `completeCovering()`, etc.
- ❌ `move_to_stage()` → Replaced by specific stage functions
- ❌ `print_barcode()` → Replaced by `handlePrintBarcode()`
- ❌ `complete_stage()` → Replaced by specific stage functions
- ❌ `get_orders_by_assignee()` → Replaced by `getQueue({ assignee_id })`
- ❌ `get_queue_minimal()` → Replaced by `getQueue()`

### **Settings - Obsolete** (1 RPC)
- ❌ `delete_setting()` - Not needed (settings are updated, not deleted)

### **Inventory - Obsolete** (1 RPC)
- ❌ `get_inventory_status()` - Replaced by `getInventoryValue()` + `getLowStockComponents()`

### **Order Management - Obsolete** (3 RPCs)
These are listed in CHANGELOG but don't match the actual implementation:
- ❌ `get_inventory_status()` - Duplicate/confusion
- ❌ `adjust_stock()` - Replaced by `updateComponentStock()`
- ❌ `create_component()` / `update_component()` - Replaced by `upsertComponent()`

**SUBTOTAL: 11 RPCs to skip**

---

## 📊 FINAL EXTRACTION PLAN

| Category | Count | Action |
|----------|-------|--------|
| **Actively Used** | 60 RPCs | ✅ Extract |
| **Unfinished Work** | 10 RPCs | ✅ Extract |
| **Shopify (if exists)** | 0-3 RPCs | ⚠️ Extract if found |
| **True Obsoletes** | 11 RPCs | ❌ Skip |
| **TOTAL TO EXTRACT** | **70-73 RPCs** | - |

---

## 🎯 EXTRACTION STRATEGY

### **Step 1: Dump All Functions from Production**
```bash
# Get all function definitions
supabase db dump --schema public --data-only=false > all_functions.sql

# Or use pg_dump
pg_dump -h [host] -U postgres -d postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  -t 'public.*' \
  > schema_dump.sql
```

### **Step 2: Filter Functions**
Extract only the 70-73 functions we need:
- All 60 actively used functions
- All 10 unfinished work functions
- Shopify functions (if they exist)

### **Step 3: Organize into Migration Files**
Split into logical groups matching CHANGELOG structure:
- `005_database_infrastructure.sql` - Helper functions, tables
- `006_staff_management_rpcs.sql` - 11 staff RPCs
- `007_order_management_rpcs.sql` - 11 order RPCs
- `008_queue_management_rpcs.sql` - Queue RPCs
- `009_scanner_stage_rpcs.sql` - 8 scanner RPCs
- `010_inventory_management_rpcs.sql` - 14 inventory RPCs
- `011_settings_management_rpcs.sql` - 12 settings RPCs
- `012_complete_grid_order_rpcs.sql` - Complete grid RPCs
- `013_final_rpcs.sql` - Messaging, admin, analytics RPCs

### **Step 4: Test in Fresh Environment**
1. Create new Supabase project
2. Apply migrations 001-039 (existing)
3. Apply migrations 005-013 (new RPCs)
4. Verify all 70-73 functions exist
5. Test with sample data

### **Step 5: Commit and PR**
- Branch: `feat/extract-production-rpcs`
- Commit message: "feat: extract 70+ RPC functions from production"
- PR with full documentation

---

## ✅ FINAL ANSWER TO YOUR QUESTION

**"Can you make another check for this please"**

**YES, we should extract more than 59:**

1. **✅ Staff Management (4 RPCs)** - Part of unfinished admin features
   - `get_staff_member`, `upsert_staff_member`, `deactivate_staff_member`, `get_shift_history`

2. **✅ Inventory Advanced (3 RPCs)** - Part of unfinished inventory features
   - `get_component`, `bulk_update_component_stock`, `deactivate_component`

3. **✅ Analytics/Payroll (2 RPCs)** - Part of unfinished analytics
   - `get_staff_times`, `get_staff_times_detail`

4. **⚠️ Shopify Integration (0-3 RPCs)** - Check if they exist
   - `test_storefront_token`, `connect_catalog`, `sync_shopify_orders`
   - If they exist in production → Extract (unfinished Phase 8)
   - If they don't exist → Skip (true placeholders)

**TOTAL: Extract 70-73 RPCs (not 59!)**

---

**Ready to proceed with extraction?** 🚀

