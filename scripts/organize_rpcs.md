# RPC Organization Plan

## Status: Ready to Extract

We have successfully exported all 95 functions from production!

## Next Steps

Since the file is large (3,202 lines), we'll organize the RPCs manually by category:

### Migration 005: Core Auth & Helpers (10 functions)
- `_order_lock`
- `alpha_suffix`
- `app_can_access_store`
- `app_is_service_role`
- `app_role`
- `auth_email`
- `current_user_name`
- `feature_rls_enabled`
- `rls_bypass`
- `settings_get_bool`

### Migration 006: Staff Management (6 functions)
- `get_staff`
- `get_staff_list`
- `get_staff_me`
- `get_staff_member`
- `get_staff_stats`
- `assign_staff` (new version)

### Migration 007: Queue & Orders (7 functions)
- `get_queue`
- `get_queue_minimal`
- `get_queue_stats`
- `get_unassigned_counts`
- `get_complete_minimal`
- `get_order_for_scan`
- `admin_delete_order`

### Migration 008: Scanner & Stage Completion (10 functions)
- `complete_filling` (both versions)
- `complete_covering` (both versions)
- `complete_decorating` (both versions)
- `complete_packing` (both versions)
- `handle_print_barcode`
- `start_packing`
- `assign_staff_to_order`
- `move_to_filling_with_assignment`
- `qc_return_to_decorating`

### Migration 009: Settings (10 functions)
- `get_setting`
- `get_settings`
- `set_setting`
- `get_flavours`
- `set_flavours`
- `get_storage_locations`
- `set_storage_locations`
- `get_monitor_density`
- `set_monitor_density`
- `get_due_date_settings`
- `set_due_date_settings`
- `get_printing_settings`
- `set_printing_settings`

### Migration 010: Inventory (15 functions)
- `get_components` (both versions)
- `upsert_component`
- `update_component_stock`
- `get_low_stock_components`
- `get_stock_transactions`
- `get_boms`
- `get_bom_details`
- `upsert_bom`
- `add_bom_component`
- `remove_bom_component`
- `get_accessory_keywords`
- `upsert_accessory_keyword`
- `delete_accessory_keyword`
- `find_component_by_keyword`
- `get_product_requirements`
- `add_product_requirement`
- `upsert_product_requirement`
- `deduct_inventory_for_order`
- `restock_order`
- `record_component_txn`

### Migration 011: Messaging (9 functions)
- `create_conversation`
- `create_conversation_text`
- `get_conversations`
- `get_conversation_participants`
- `get_messages` (main version)
- `send_message`
- `mark_messages_read`
- `get_unread_count`
- `add_participant` (both versions)
- `remove_participant` (both versions)

### Migration 012: Workers & Background Jobs (3 functions)
- `process_webhook_order_split`
- `process_kitchen_task_create`
- `ingest_order` (both versions)
- `is_cake_item`

### Migration 013: Order Updates & Triggers (4 functions)
- `update_order_core`
- `orders_set_human_id`
- `set_updated_at`
- `test_auth`
- `test_rpc_call`

## Extraction Method

**Manual Extraction via Supabase Dashboard:**

For each migration:
1. Open Supabase SQL Editor
2. Search for each function name in `scripts/all_functions.sql`
3. Copy the complete function definition (from `CREATE OR REPLACE` to the final `;`)
4. Create migration file: `supabase/migrations/00X_category_name.sql`
5. Paste all functions for that category
6. Add header comment with category name and function list

## Estimated Time

- ~10-15 minutes per migration
- Total: ~2 hours for all 8 migrations

## Verification

After extraction:
1. Run `supabase db reset` in a test environment
2. Verify all migrations apply cleanly
3. Test key RPCs in the frontend
4. Create PR for review

