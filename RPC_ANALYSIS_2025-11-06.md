# RPC Functions Analysis - November 6, 2025

**Purpose:** Identify which RPCs are actually needed vs obsolete before extraction  
**Status:** Analysis Complete  
**Date:** 2025-11-06

---

## 📊 SUMMARY

**Total RPCs in rpc-client.ts:** 64 functions  
**RPCs documented in CHANGELOG:** 50+ functions  
**RPCs actually used in UI:** ~45 functions (estimated)

---

## ✅ CATEGORY 1: CRITICAL - ACTIVELY USED (Must Extract)

### **Queue & Order Management** (10 RPCs)
Used in: Dashboard, StaffWorkspace, SupervisorWorkspace, QueueTable, ProductionStatus

- ✅ `getQueue()` - Main queue function (CRITICAL)
- ✅ `getQueueStats()` - Queue statistics
- ✅ `getUnassignedCounts()` - Unassigned counts
- ✅ `getOrder()` - Single order lookup
- ✅ `assignStaff()` - Staff assignment
- ✅ `unassignStaff()` - Remove staff assignment
- ✅ `setStorage()` - Set storage location
- ✅ `updateOrderNotes()` - Update notes
- ✅ `updateOrderPriority()` - Change priority
- ✅ `updateOrderDueDate()` - Update due date

**Status:** ALL MUST BE EXTRACTED

---

### **Scanner & Stage Progression** (8 RPCs)
Used in: ScannerOverlay, StaffWorkspace, SupervisorWorkspace

- ✅ `handlePrintBarcode()` - Print barcode
- ✅ `getOrderForScan()` - Barcode lookup
- ✅ `completeFilling()` - Complete filling stage
- ✅ `completeCovering()` - Complete covering stage
- ✅ `completeDecorating()` - Complete decorating stage
- ✅ `startPacking()` - Start packing
- ✅ `completePacking()` - Complete packing
- ✅ `qcReturnToDecorating()` - QC return (Supervisor only)

**Status:** ALL MUST BE EXTRACTED

---

### **Inventory Management** (10 RPCs)
Used in: ComponentsInventory, BOMsInventory, AccessoryKeywords, ProductRequirements, TransactionsInventory

- ✅ `getComponents()` - Get components list
- ✅ `getLowStockComponents()` - Low stock alerts
- ✅ `getInventoryValue()` - Total inventory value
- ✅ `updateComponentStock()` - Update stock levels
- ✅ `upsertComponent()` - Create/update component
- ✅ `getBoms()` - Get BOMs list
- ✅ `upsertBom()` - Create/update BOM
- ✅ `getAccessoryKeywords()` - Get keywords
- ✅ `upsertAccessoryKeyword()` - Create/update keyword
- ✅ `getProductRequirements()` - Get requirements

**Status:** ALL MUST BE EXTRACTED

---

### **Settings Management** (10 RPCs)
Used in: SettingsPage, various components

- ✅ `getSettings()` - Get all settings
- ✅ `getSetting()` - Get single setting
- ✅ `setSetting()` - Set setting value
- ✅ `getPrintingSettings()` - Get printing config
- ✅ `setPrintingSettings()` - Set printing config
- ✅ `getMonitorDensity()` - Get monitor density
- ✅ `setMonitorDensity()` - Set monitor density
- ✅ `getFlavours()` - Get flavours list
- ✅ `setFlavours()` - Update flavours
- ✅ `getStorageLocations()` - Get storage locations

**Status:** ALL MUST BE EXTRACTED

---

### **Staff Management** (7 RPCs)
Used in: StaffWorkspace, Dashboard, shift tracking

- ✅ `getStaffList()` - Get all staff
- ✅ `getStaffMe()` - Get current user
- ✅ `startShift()` - Clock in
- ✅ `endShift()` - Clock out
- ✅ `startBreak()` - Start break
- ✅ `endBreak()` - End break
- ✅ `getCurrentShift()` - Get active shift

**Status:** ALL MUST BE EXTRACTED

---

### **Messaging System** (10 RPCs)
Used in: MessagingPage, messaging components

- ✅ `createConversation()` - Create conversation
- ✅ `getConversations()` - Get conversations list
- ✅ `getConversationParticipants()` - Get participants
- ✅ `sendMessage()` - Send message
- ✅ `getMessages()` - Get messages
- ✅ `markMessagesRead()` - Mark as read
- ✅ `getUnreadCount()` - Unread count
- ✅ `addParticipant()` - Add participant
- ✅ `removeParticipant()` - Remove participant

**Status:** ALL MUST BE EXTRACTED (Messaging is v0.7.0-beta feature)

---

## ⚠️ CATEGORY 2: UNCERTAIN - NEED VERIFICATION (Check Before Extracting)

### **Order Core Updates** (1 RPC)
- ⚠️ `updateOrderCore()` - Update core order fields

**Question:** Is this used in EditOrderDrawer or similar? Need to verify.

---

### **Complete Grid** (1 RPC)
- ⚠️ `getComplete()` - Get completed orders

**Question:** Is there a "Complete Orders" view? Need to verify.

---

### **Bulk Operations** (2 RPCs)
- ⚠️ `bulkAssign()` - Assign multiple orders to staff
- ⚠️ `cancelOrder()` - Cancel an order (Admin only)

**Question:** Are these features implemented in UI? Need to verify.

---

### **Stock Transactions** (2 RPCs)
- ⚠️ `getStockTransactions()` - Get transaction history
- ⚠️ `upsertProductRequirement()` - Create/update requirement
- ⚠️ `restockOrder()` - Restock order

**Question:** Used in TransactionsInventory tab? Need to verify.

---

### **Due Date Settings** (2 RPCs)
- ⚠️ `getDueDateSettings()` - Get due date settings
- ⚠️ `setDueDateSettings()` - Set due date settings

**Question:** Is this feature complete? Only used in DueDateTest.tsx

---

## ❌ CATEGORY 3: OBSOLETE - DO NOT EXTRACT (Placeholders/Unused)

### **Shopify Integration Placeholders** (3 RPCs)
According to CHANGELOG, these are explicitly marked as "placeholders"

- ❌ `test_storefront_token()` - Shopify token test (PLACEHOLDER)
- ❌ `connect_catalog()` - Shopify catalog (PLACEHOLDER)
- ❌ `sync_shopify_orders()` - Shopify sync (PLACEHOLDER)

**Reason:** Webhooks handle Shopify integration now. These were never implemented.

---

### **Staff Management - Unused** (4 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `get_staff_member()` - Get individual staff (not in rpc-client.ts)
- ❌ `upsert_staff_member()` - Create/update staff (not in rpc-client.ts)
- ❌ `deactivate_staff_member()` - Soft delete (not in rpc-client.ts)
- ❌ `get_shift_history()` - Shift history (not in rpc-client.ts)

**Reason:** Not implemented in frontend, likely replaced by simpler functions.

---

### **Order Management - Unused** (2 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `move_to_next_stage()` - Stage progression (not in rpc-client.ts)
- ❌ `move_to_stage()` - Move to specific stage (not in rpc-client.ts)

**Reason:** Replaced by specific stage completion functions (completeFilling, etc.)

---

### **Queue Management - Unused** (2 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `get_orders_by_assignee()` - Orders by assignee (not in rpc-client.ts)
- ❌ `get_queue_minimal()` - Minimal queue (not in rpc-client.ts)

**Reason:** Replaced by `getQueue()` with parameters.

---

### **Scanner - Unused** (2 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `print_barcode()` - Compatibility wrapper (not in rpc-client.ts)
- ❌ `complete_stage()` - Compatibility wrapper (not in rpc-client.ts)

**Reason:** Replaced by specific functions (handlePrintBarcode, completeFilling, etc.)

---

### **Inventory - Unused** (4 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `get_component()` - Get single component (not in rpc-client.ts)
- ❌ `bulk_update_component_stock()` - Bulk update (not in rpc-client.ts)
- ❌ `deactivate_component()` - Soft delete (not in rpc-client.ts)
- ❌ `get_inventory_status()` - Detailed status (not in rpc-client.ts)

**Reason:** Not implemented in frontend.

---

### **Settings - Unused** (2 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `delete_setting()` - Delete setting (not in rpc-client.ts)
- ❌ `get_complete_minimal()` - Simplified complete (not in rpc-client.ts)

**Reason:** Not needed in current implementation.

---

### **Analytics/Payroll - Unused** (2 RPCs)
Not found in rpc-client.ts but mentioned in CHANGELOG

- ❌ `get_staff_times()` - Time and payroll (not in rpc-client.ts)
- ❌ `get_staff_times_detail()` - Detailed payroll (not in rpc-client.ts)

**Reason:** Analytics features not yet implemented (Task 9+).

---

## 📊 FINAL COUNT

| Category | Count | Action |
|----------|-------|--------|
| **CRITICAL - Must Extract** | 55 RPCs | ✅ Extract |
| **UNCERTAIN - Verify First** | 8 RPCs | ⚠️ Check usage |
| **OBSOLETE - Skip** | 24 RPCs | ❌ Do not extract |
| **TOTAL** | 87 RPCs | - |

---

## 🎯 RECOMMENDED EXTRACTION PLAN

### **Phase 1: Extract Core RPCs (55 functions)**
Extract all functions currently in `rpc-client.ts` that are actively used:
- Queue & Order Management (10)
- Scanner & Stage Progression (8)
- Inventory Management (10)
- Settings Management (10)
- Staff Management (7)
- Messaging System (10)

**These are CRITICAL and must be extracted.**

---

### **Phase 2: Verify Uncertain RPCs (8 functions)**
Before extracting, check if these are actually used:
1. Search codebase for usage
2. If used → extract
3. If not used → skip

**List to verify:**
- `updateOrderCore`
- `getComplete`
- `bulkAssign`
- `cancelOrder`
- `getStockTransactions`
- `upsertProductRequirement`
- `restockOrder`
- `getDueDateSettings`
- `setDueDateSettings`

---

### **Phase 3: Skip Obsolete RPCs (24 functions)**
Do NOT extract these - they were never implemented or are placeholders:
- Shopify integration placeholders (3)
- Staff management unused (4)
- Order management unused (2)
- Queue management unused (2)
- Scanner unused (2)
- Inventory unused (4)
- Settings unused (2)
- Analytics/payroll unused (2)
- Complete grid unused (1)
- Storage locations setter (1)
- Set flavours (1)

---

## ✅ NEXT STEPS

1. **Verify the 8 uncertain RPCs** (15 minutes)
   - Search codebase for actual usage
   - Decide: extract or skip

2. **Extract 55-63 core RPCs from production** (2-3 hours)
   - Use `supabase db dump` or `pg_dump`
   - Create migration files (005-013)
   - Test in fresh environment

3. **Document extraction process** (30 minutes)
   - Update DATABASE_AUDIT_2025-11-06.md
   - Create extraction guide for future reference

---

**Total RPCs to extract: 55-63 (depending on verification)**  
**Total RPCs to skip: 24-32 (obsolete/unused)**

---

**End of Analysis**

