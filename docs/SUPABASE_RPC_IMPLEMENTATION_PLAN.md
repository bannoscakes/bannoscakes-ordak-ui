# Supabase RPC Implementation Plan
**Version:** 1.0.0  
**Created:** 2025-01-30  
**Status:** In Progress

## 🎯 Overview
Complete implementation of all RPC functions as defined in `rpc-surface.md`. Each RPC will be implemented in small, testable pieces with feature branches for safety.

## 📋 Implementation Strategy
- **Small Pieces**: Each RPC group = 1 feature branch
- **Test First**: Each branch tested before merging to dev
- **Incremental**: Build on previous work, don't break existing functionality
- **Documentation**: Update docs as we go

---

## 🗂️ Phase 1: Core Database Tables & Infrastructure ✅

### Branch: `feat/database-infrastructure`
**Priority:** Critical  
**Estimate:** 1-2 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] Create `staff_shifts` table for time tracking
- [x] Create `settings` table for store configuration  
- [x] Create `components` table for inventory/BOM
- [x] Create `stage_events` table for audit trail
- [x] Create `audit_log` table for security logging
- [x] Add missing indexes and constraints
- [x] Create helper functions for role checking
- [x] Test all table creation and relationships

#### Acceptance Criteria:
- All tables created with proper relationships
- Indexes optimized for performance
- Helper functions working
- No breaking changes to existing functionality

---

## 🗂️ Phase 2: Staff Management RPCs ✅

### Branch: `feat/staff-management-rpcs`
**Priority:** High  
**Estimate:** 2-3 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] `get_staff_list` - Get all staff with filtering
- [x] `get_staff_member` - Get individual staff details  
- [x] `upsert_staff_member` - Create/update staff members
- [x] `deactivate_staff_member` - Soft delete staff
- [x] `start_shift/end_shift` - Shift management
- [x] `get_current_shift` - Get active shift details
- [x] `get_shift_history` - Get shift history with filtering
- [x] `start_break/end_break` - Break management
- [x] Role-based access control and audit logging

#### Acceptance Criteria:
- All staff management RPCs working with proper validation
- Shift tracking and break management working
- Role-based permissions enforced
- Audit logging for all staff changes

---

## 🗂️ Phase 3: Order Management RPCs ✅

### Branch: `feat/order-management-rpcs`
**Priority:** High  
**Estimate:** 2-3 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] `assign_staff` - Assign staff member to order
- [x] `unassign_staff` - Remove staff assignment
- [x] `move_to_next_stage` - Move to next stage automatically
- [x] `move_to_stage` - Move to specific stage
- [x] `update_order_notes` - Update order notes
- [x] `update_order_priority` - Change priority level
- [x] `update_order_due_date` - Update due date
- [x] `get_order` - Get single order with assignee details
- [x] Test all order management operations

#### Acceptance Criteria:
- All order management RPCs working with proper validation
- Stage progression working correctly
- Order updates with audit logging
- Staff assignment working

---

## 🗂️ Phase 4: Queue Management RPCs ✅

### Branch: `feat/queue-management-rpcs`
**Priority:** Critical  
**Estimate:** 2-3 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] `get_queue` - Full queue with all parameters (store, stage, assignee, storage, search, pagination)
- [x] `get_queue_stats` - Queue statistics and counts by stage
- [x] `get_unassigned_counts` - Unassigned orders count by stage
- [x] `set_storage` - Set storage location for order
- [x] `get_orders_by_assignee` - Get orders assigned to specific staff
- [x] `get_queue_minimal` - Updated compatibility wrapper
- [x] Test all queue operations

#### Acceptance Criteria:
- All queue RPCs working with proper validation
- UI updated to use new functions
- Pagination and filtering working
- Staff assignment working
- Storage management working

---

## 🗂️ Phase 3: Scanner & Stage Management RPCs ✅

### Branch: `feat/scanner-stage-rpcs`
**Priority:** Critical  
**Estimate:** 3-4 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] `handle_print_barcode` - Print barcode and start filling stage
- [x] `complete_filling` - Complete filling stage
- [x] `complete_covering` - Complete covering stage
- [x] `complete_decorating` - Complete decorating stage
- [x] `start_packing` - Start packing stage
- [x] `complete_packing` - Complete packing stage
- [x] `qc_return_to_decorating` - QC return to decorating
- [x] `get_order_for_scan` - Lookup order by barcode/scan
- [x] Compatibility wrappers (`print_barcode`, `complete_stage`)
- [x] Test all stage transitions

#### Acceptance Criteria:
- All stage transitions working correctly
- Barcode scanning integration working
- Stage timestamps updated properly
- QC workflow working
- Scanner UI updated

---

## 🗂️ Phase 4: Inventory Management RPCs ✅

### Branch: `feat/inventory-management-rpcs`
**Priority:** High  
**Estimate:** 2-3 days  
**Status:** ✅ COMPLETED

#### Tasks:
- [x] `get_components` - Get all components with filtering
- [x] `get_component` - Get single component by ID or SKU
- [x] `upsert_component` - Create or update components
- [x] `update_component_stock` - Update stock levels with audit trail
- [x] `get_low_stock_components` - Get components below minimum stock
- [x] `get_inventory_value` - Get total inventory value and summary
- [x] `bulk_update_component_stock` - Update multiple components at once
- [x] `deactivate_component` - Soft delete components
- [x] Test all inventory management operations

---

## 🗂️ Phase 5: Staff & Time Management RPCs

### Branch: `feat/staff-time-rpcs`
**Priority:** High  
**Estimate:** 2-3 days

#### Tasks:
- [ ] `get_staff_me` - Get current staff member info
- [ ] `start_shift` - Start work shift (Already done in Phase 2!)
- [ ] `end_shift` - End work shift (Already done in Phase 2!)
- [ ] `start_break` - Start break (Already done in Phase 2!)
- [ ] `end_break` - End break (Already done in Phase 2!)
- [ ] Time tracking validation and business rules
- [ ] Test all time tracking operations
- [ ] Update StaffWorkspacePage component

#### Acceptance Criteria:
- Time tracking working correctly
- Shift management working
- Break tracking working
- Staff UI updated
- Business rules enforced

---

## 🗂️ Phase 5: Settings Management RPCs

### Branch: `feat/settings-rpcs`
**Priority:** Medium  
**Estimate:** 2-3 days

#### Tasks:
- [ ] `get_settings_printing` - Get printing configuration
- [ ] `set_settings_printing` - Set printing configuration
- [ ] `get_flavours` - Get available flavors
- [ ] `set_flavours` - Set available flavors
- [ ] `get_storage_locations` - Get storage locations
- [ ] `set_storage_locations` - Set storage locations
- [ ] `get_monitor_density` - Get monitor density setting
- [ ] `set_monitor_density` - Set monitor density setting
- [ ] Role-based access control (Admin/Supervisor)
- [ ] Test all settings operations
- [ ] Update SettingsPage component

#### Acceptance Criteria:
- All settings RPCs working
- Role-based access enforced
- Settings UI updated
- Data validation working

---

## 🗂️ Phase 6: Complete Grid & Order Management RPCs

### Branch: `feat/complete-grid-rpcs`
**Priority:** High  
**Estimate:** 2-3 days

#### Tasks:
- [ ] `get_complete` - Get completed orders with filtering
- [ ] `update_order_core` - Update order core fields
- [ ] Order editing validation and business rules
- [ ] Test all order management operations
- [ ] Update OrderDetailDrawer component
- [ ] Update complete orders views

#### Acceptance Criteria:
- Complete orders filtering working
- Order editing working
- Validation rules enforced
- UI components updated

---

## 🗂️ Phase 7: Inventory & BOM RPCs

### Branch: `feat/inventory-bom-rpcs`
**Priority:** Medium  
**Estimate:** 3-4 days

#### Tasks:
- [ ] `create_component` - Create new inventory component
- [ ] `update_component` - Update component details
- [ ] `adjust_stock` - Adjust stock levels
- [ ] Inventory validation and business rules
- [ ] Test all inventory operations
- [ ] Update InventoryPage components

#### Acceptance Criteria:
- Inventory management working
- Stock adjustments working
- BOM functionality working
- UI components updated

---

## 🗂️ Phase 8: Enhanced Shopify Integration

### Branch: `feat/enhanced-shopify-rpcs`
**Priority:** High  
**Estimate:** 2-3 days

#### Tasks:
- [ ] `test_storefront_token` - Test Shopify connection
- [ ] `connect_catalog` - Connect product catalog
- [ ] `sync_shopify_orders` - Sync orders from Shopify
- [ ] Enhanced `ingest_order` with more fields
- [ ] HMAC verification for webhooks
- [ ] Test all Shopify operations
- [ ] Update webhook handling

#### Acceptance Criteria:
- Shopify integration working
- Webhook security implemented
- Order sync working
- Error handling robust

---

## 🗂️ Phase 9: Admin & Bulk Operations

### Branch: `feat/admin-bulk-rpcs`
**Priority:** Medium  
**Estimate:** 2-3 days

#### Tasks:
- [ ] Bulk staff assignment functions
- [ ] Bulk storage updates
- [ ] Admin-only operations
- [ ] Bulk order operations
- [ ] Test all admin operations
- [ ] Update admin UI components

#### Acceptance Criteria:
- Bulk operations working
- Admin permissions enforced
- UI components updated
- Performance optimized

---

## 🗂️ Phase 10: Final Integration & Testing

### Branch: `feat/final-integration`
**Priority:** Critical  
**Estimate:** 2-3 days

#### Tasks:
- [ ] End-to-end testing of all RPCs
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates
- [ ] Security audit
- [ ] Production readiness check

#### Acceptance Criteria:
- All RPCs working together
- Performance meets requirements
- Security audit passed
- Documentation complete
- Ready for production

---

## 📊 Progress Tracking

### Overall Progress: 0/10 Phases Complete

| Phase | Status | Branch | Progress |
|-------|--------|--------|----------|
| 1. Database Infrastructure | ⏳ Pending | `feat/database-infrastructure` | 0% |
| 2. Queue Management | ⏳ Pending | `feat/queue-management-rpcs` | 0% |
| 3. Scanner & Stage | ⏳ Pending | `feat/scanner-stage-rpcs` | 0% |
| 4. Staff & Time | ⏳ Pending | `feat/staff-time-rpcs` | 0% |
| 5. Settings | ⏳ Pending | `feat/settings-rpcs` | 0% |
| 6. Complete Grid | ⏳ Pending | `feat/complete-grid-rpcs` | 0% |
| 7. Inventory & BOM | ⏳ Pending | `feat/inventory-bom-rpcs` | 0% |
| 8. Enhanced Shopify | ⏳ Pending | `feat/enhanced-shopify-rpcs` | 0% |
| 9. Admin & Bulk | ⏳ Pending | `feat/admin-bulk-rpcs` | 0% |
| 10. Final Integration | ⏳ Pending | `feat/final-integration` | 0% |

---

## 🚀 Next Steps

1. **Start with Phase 1**: Database Infrastructure
2. **Create feature branch**: `feat/database-infrastructure`
3. **Implement incrementally**: One table/function at a time
4. **Test thoroughly**: Before merging to dev
5. **Document progress**: Update this file as we go

---

## 📝 Notes

- Each phase builds on the previous one
- No breaking changes to existing functionality
- All RPCs follow the standard response envelope
- Security and validation are built-in from the start
- Performance is considered at each step

---

**Ready to start with Phase 1?** 🚀
