-- List of Target RPCs to Extract (70-73 functions)
-- Purpose: Verify which functions exist in production before extraction
-- Date: 2025-11-06

-- Check which of our target functions exist in production
WITH target_functions AS (
  SELECT unnest(ARRAY[
    -- Queue & Order Management (11)
    'get_queue',
    'get_queue_stats',
    'get_unassigned_counts',
    'get_order',
    'assign_staff',
    'unassign_staff',
    'set_storage',
    'update_order_notes',
    'update_order_priority',
    'update_order_due_date',
    'update_order_core',
    
    -- Scanner & Stage (8)
    'handle_print_barcode',
    'get_order_for_scan',
    'complete_filling',
    'complete_covering',
    'complete_decorating',
    'start_packing',
    'complete_packing',
    'qc_return_to_decorating',
    
    -- Inventory (14)
    'get_components',
    'get_low_stock_components',
    'get_inventory_value',
    'update_component_stock',
    'upsert_component',
    'get_boms',
    'upsert_bom',
    'get_accessory_keywords',
    'upsert_accessory_keyword',
    'get_product_requirements',
    'upsert_product_requirement',
    'get_stock_transactions',
    'restock_order',
    'get_component',
    'bulk_update_component_stock',
    'deactivate_component',
    
    -- Settings (12)
    'get_settings',
    'get_setting',
    'set_setting',
    'get_printing_settings',
    'set_printing_settings',
    'get_monitor_density',
    'set_monitor_density',
    'get_flavours',
    'set_flavours',
    'get_storage_locations',
    'set_storage_locations',
    'get_due_date_settings',
    'set_due_date_settings',
    
    -- Staff Management (11)
    'get_staff_list',
    'get_staff_me',
    'start_shift',
    'end_shift',
    'start_break',
    'end_break',
    'get_current_shift',
    'get_staff_member',
    'upsert_staff_member',
    'deactivate_staff_member',
    'get_shift_history',
    
    -- Messaging (9)
    'create_conversation',
    'get_conversations',
    'get_conversation_participants',
    'send_message',
    'get_messages',
    'mark_messages_read',
    'get_unread_count',
    'add_participant',
    'remove_participant',
    
    -- Admin & Complete (4)
    'bulk_assign',
    'cancel_order',
    'get_complete',
    'get_complete_minimal',
    
    -- Analytics (2)
    'get_staff_times',
    'get_staff_times_detail',
    
    -- Shopify (3) - Check if these exist
    'test_storefront_token',
    'connect_catalog',
    'sync_shopify_orders'
  ]) as function_name
)
SELECT 
  tf.function_name,
  CASE 
    WHEN p.proname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN p.proname IS NOT NULL THEN pg_get_functiondef(p.oid)
    ELSE NULL
  END as definition
FROM target_functions tf
LEFT JOIN pg_proc p ON p.proname = tf.function_name
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
ORDER BY 
  CASE WHEN p.proname IS NOT NULL THEN 0 ELSE 1 END,
  tf.function_name;

-- Summary count
SELECT 
  COUNT(*) FILTER (WHERE p.proname IS NOT NULL) as functions_found,
  COUNT(*) FILTER (WHERE p.proname IS NULL) as functions_missing,
  COUNT(*) as total_target_functions
FROM target_functions tf
LEFT JOIN pg_proc p ON p.proname = tf.function_name
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public';

