# RPC Extraction - Next Steps

## ✅ COMPLETED

1. ✅ Identified all 95 functions in production database
2. ✅ Exported complete function definitions to `scripts/all_functions.sql`
3. ✅ Analyzed which functions to extract (70-73 target RPCs)
4. ✅ Organized functions into 8 migration categories

---

## 🎯 READY TO PROCEED

You now have **all the function definitions** in `scripts/all_functions.sql` (3,202 lines).

### Option 1: Manual Extraction (Recommended)

**Why Manual?**
- More control over organization
- Can review each function
- Can add comments and documentation
- Ensures clean migration files

**Steps:**
1. Open `scripts/all_functions.sql` in your editor
2. For each migration category (see below), copy the relevant functions
3. Create migration file: `supabase/migrations/00X_category_name.sql`
4. Paste functions into migration file
5. Add header comment with category name

**Time Estimate:** ~2 hours for all 8 migrations

---

### Option 2: Semi-Automated Extraction

I can create a script to extract specific functions by name. This would:
- Search `all_functions.sql` for each function name
- Extract the complete definition
- Group by category
- Generate migration files

**Would you like me to create this script?**

---

## 📋 MIGRATION BREAKDOWN

### Migration 005: Core Auth & Helpers (10 functions)
```
_order_lock
alpha_suffix
app_can_access_store
app_is_service_role
app_role
auth_email
current_user_name
feature_rls_enabled
rls_bypass
settings_get_bool
```

### Migration 006: Staff Management (6 functions)
```
get_staff
get_staff_list
get_staff_me
get_staff_member
get_staff_stats
assign_staff
```

### Migration 007: Queue & Orders (7 functions)
```
get_queue
get_queue_minimal
get_queue_stats
get_unassigned_counts
get_complete_minimal
get_order_for_scan
admin_delete_order
```

### Migration 008: Scanner & Stage Completion (10 functions)
```
complete_filling (2 versions)
complete_covering (2 versions)
complete_decorating (2 versions)
complete_packing (2 versions)
handle_print_barcode
start_packing
assign_staff_to_order
move_to_filling_with_assignment
qc_return_to_decorating
```

### Migration 009: Settings (13 functions)
```
get_setting
get_settings
set_setting
get_flavours
set_flavours
get_storage_locations
set_storage_locations
get_monitor_density
set_monitor_density
get_due_date_settings
set_due_date_settings
get_printing_settings
set_printing_settings
```

### Migration 010: Inventory (20 functions)
```
get_components (2 versions)
upsert_component
update_component_stock
get_low_stock_components
get_stock_transactions
get_boms
get_bom_details
upsert_bom
add_bom_component
remove_bom_component
get_accessory_keywords
upsert_accessory_keyword
delete_accessory_keyword
find_component_by_keyword
get_product_requirements
add_product_requirement
upsert_product_requirement
deduct_inventory_for_order
restock_order
record_component_txn
```

### Migration 011: Messaging (11 functions)
```
create_conversation
create_conversation_text
get_conversations
get_conversation_participants
get_messages
send_message
mark_messages_read
get_unread_count
add_participant (2 versions)
remove_participant (2 versions)
```

### Migration 012: Workers & Background Jobs (4 functions)
```
process_webhook_order_split
process_kitchen_task_create
ingest_order (2 versions)
is_cake_item
```

### Migration 013: Order Updates & Triggers (4 functions)
```
update_order_core
orders_set_human_id
set_updated_at
test_auth
test_rpc_call
```

---

## 🚀 WHAT WOULD YOU LIKE TO DO?

1. **Manual Extraction**: I'll guide you through each migration
2. **Semi-Automated**: I'll create a script to extract functions by name
3. **Start with One**: Let's do Migration 005 together as an example

**What's your preference?** 🤔

