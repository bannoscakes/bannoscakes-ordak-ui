# RPC Surface
**Version:** 2.0.0
**Last Updated:** 2025-12-31
**Status:** Production

All RPCs are **SECURITY DEFINER** and include role validation, input guards, and **idempotency** where applicable.

---

## Conventions

- **Roles:** `Admin` | `Supervisor` | `Staff` (checked via `current_user_role()` helper)
- **Stores:** `'bannos'` | `'flourlane'`
- **Stages:** `Filling → Covering → Decorating → Packing → Complete`
- **Filling starts** at barcode print; scan **completes** Filling
- **No direct table writes**; RLS everywhere. All mutations via RPCs
- **Audit logging** via `stage_events` table for stage transitions
- **Idempotency:** repeat calls return same state

---

## Queue & Orders

### Queue Queries

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_queue` | `p_store, p_stage, p_assignee_id, p_storage, p_priority, p_search, p_offset, p_limit, p_sort_by, p_sort_order` | Main production queue with filtering |
| `get_queue_stats` | `p_store` | Stage counts and summary stats |
| `get_unassigned_counts` | `p_store` | Count of unassigned orders per stage |
| `get_complete` | `p_store, p_start_date, p_end_date, p_search, p_offset, p_limit, p_sort_by, p_sort_order` | Completed orders grid |
| `find_order` | `p_search` | Universal search across all stages |

### Order Read

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_order` | `p_order_id, p_store` | Basic order details |
| `get_order_v2` | `p_order_id, p_store` | Extended details with shipping_address, accessories |
| `get_order_for_scan` | `p_scan` | Lookup by barcode (supports #B18617, bannos-18617, 18617) |

### Order Operations

| Function | Parameters | Description |
|----------|------------|-------------|
| `assign_staff` | `p_order_id, p_store, p_staff_id` | Assign staff to order |
| `assign_staff_bulk` | `p_order_ids, p_store, p_staff_id` | Bulk assign staff |
| `unassign_staff` | `p_order_id, p_store` | Remove assignment |
| `set_storage` | `p_store, p_order_id, p_storage` | Set storage location |
| `update_order_notes` | `p_order_id, p_store, p_notes` | Update notes |
| `update_order_priority` | `p_order_id, p_store, p_priority` | Set priority (HIGH/MEDIUM/LOW) |
| `update_order_due_date` | `p_order_id, p_store, p_due_date` | Change due date |
| `update_order_core` | `p_order_id, p_store, p_customer_name, p_product_title, p_flavour, p_notes, p_due_date, p_delivery_method, p_size, p_item_qty, p_storage, p_cake_writing` | Admin edit |

### Bulk Operations

| Function | Parameters | Description |
|----------|------------|-------------|
| `bulk_assign` | `p_store, p_order_ids, p_staff_id` | Assign multiple orders |
| `cancel_order` | `p_order_id, p_store, p_reason` | Cancel order |
| `mark_order_complete` | `p_order_id, p_store` | Admin: skip to Complete |
| `create_manual_order` | `p_store, p_order_number, p_customer_name, p_product_title, p_size, p_flavour, p_due_date, p_writing_on_cake, p_image_url, p_notes` | Create order manually |

---

## Scanner / Stage Transitions

### Barcode

| Function | Parameters | Description |
|----------|------------|-------------|
| `handle_print_barcode` | `p_barcode, p_order_id, p_performed_by, p_context` | Low-level barcode handler |
| `print_barcode` | `p_store, p_order_id` | Print barcode, sets `filling_start_ts` on first print |

### Stage Completion

| Function | Parameters | Description |
|----------|------------|-------------|
| `complete_filling` | `p_order_id, p_store, p_notes` | Complete Filling → Covering |
| `start_covering` | `p_order_id, p_store` | Optional: mark covering started |
| `complete_covering` | `p_order_id, p_store, p_notes` | Complete Covering → Decorating |
| `start_decorating` | `p_order_id, p_store` | Optional: mark decorating started |
| `complete_decorating` | `p_order_id, p_store, p_notes` | Complete Decorating → Packing |
| `complete_packing` | `p_order_id, p_store, p_notes` | Complete Packing → Complete |
| `qc_return_to_decorating` | `p_order_id, p_store, p_notes` | QC fail: return to Decorating |

---

## Staff Management

### Staff Queries

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_staff_me` | - | Current user's staff record |
| `get_staff_list` | `p_role, p_is_active` | List staff with filters |
| `get_staff_with_shift_status` | - | Staff list with shift status |
| `get_all_active_shifts` | - | All currently active shifts |

### Staff Admin

| Function | Parameters | Description |
|----------|------------|-------------|
| `update_staff_member` | `p_user_id, p_full_name, p_role, p_hourly_rate, p_is_active, p_approved, p_phone` | Update staff record (Admin) |

---

## Time & Payroll

### Shifts

| Function | Parameters | Description |
|----------|------------|-------------|
| `start_shift` | `p_store, p_staff_id` | Clock in |
| `end_shift` | `p_staff_id` | Clock out |
| `start_break` | `p_staff_id` | Start break |
| `end_break` | `p_staff_id` | End break |
| `get_current_shift` | `p_staff_id` | Get active shift |

### Time Reports

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_staff_times` | `p_from, p_to, p_staff_id` | Time summary for date range |
| `get_staff_times_detail` | `p_staff_id, p_from, p_to` | Detailed shift records |
| `adjust_staff_time` | `p_shift_id, p_new_start, p_new_end, p_note` | Admin time correction |

---

## Inventory

### Components

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_components` | `p_category, p_active_only, p_search` | List components |
| `get_low_stock_components` | - | Components below min_stock |
| `upsert_component` | `p_id, p_sku, p_name, p_description, p_category, p_min_stock, p_unit, p_is_active` | Create/update component |
| `adjust_component_stock` | `p_component_id, p_change, p_reason, p_reference, p_created_by` | Stock adjustment |
| `delete_component` | `p_id` | Soft delete |

### Accessories

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_accessories` | `p_category, p_active_only` | List accessories |
| `get_accessories_needing_sync` | - | Accessories flagged for Shopify sync |
| `upsert_accessory` | `p_id, p_sku, p_name, p_category, p_product_match, p_min_stock, p_is_active` | Create/update |
| `adjust_accessory_stock` | `p_accessory_id, p_change, p_reason, p_reference, p_created_by` | Stock adjustment |
| `soft_delete_accessory` | `p_id` | Soft delete |

### Cake Toppers

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_cake_toppers` | `p_active_only` | List cake toppers |
| `upsert_cake_topper` | `p_id, p_name_1, p_name_2, p_min_stock, p_shopify_product_id_1, p_shopify_product_id_2, p_is_active` | Create/update |
| `adjust_cake_topper_stock` | `p_topper_id, p_change, p_reason, p_reference, p_created_by` | Stock adjustment |
| `soft_delete_cake_topper` | `p_id` | Soft delete |

### BOMs

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_boms` | `p_store, p_active_only, p_search` | List BOMs with items |
| `upsert_bom` | `p_id, p_product_title, p_store, p_description, p_is_active, p_shopify_product_id` | Create/update BOM header |
| `save_bom_items` | `p_bom_id, p_items` | Replace BOM items (array of component_id, quantity, stage) |
| `delete_bom` | `p_id` | Delete BOM |

### Accessory Keywords

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_accessory_keywords` | `p_search, p_is_active` | List keyword mappings |
| `upsert_accessory_keyword` | `p_keyword, p_component_id, p_id, p_priority, p_match_type, p_is_active` | Create/update keyword |

### Stock Audit

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_stock_transactions` | `p_table_name, p_item_id, p_limit` | Stock transaction history |

---

## Settings

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_settings` | `p_store` | All settings for store |
| `get_setting` | `p_store, p_key` | Single setting value |
| `set_setting` | `p_store, p_key, p_value` | Update setting |
| `get_printing_settings` | `p_store` | Printing configuration |
| `set_printing_settings` | `p_store, p_settings` | Update printing config |
| `get_monitor_density` | `p_store` | TV display density |
| `set_monitor_density` | `p_store, p_density` | Set density (compact/normal/expanded) |
| `get_flavours` | `p_store` | Flavour list |
| `set_flavours` | `p_store, p_flavours` | Update flavours |
| `get_storage_locations` | `p_store` | Storage location list |
| `set_storage_locations` | `p_store, p_locations` | Update storage locations |
| `get_due_date_settings` | `p_store` | Due date configuration |

---

## Shopify Integration

| Function | Parameters | Description |
|----------|------------|-------------|
| `test_admin_token` | `p_store, p_token` | Validate Admin API token |
| `sync_shopify_orders` | `p_store` | Trigger order sync |
| `get_sync_log` | `p_store, p_limit` | Sync run history |

**Edge Functions:**
- `shopify-webhooks-bannos` - Receive Bannos webhook orders
- `shopify-webhooks-flourlane` - Receive Flourlane webhook orders
- `sync-shopify-orders` - Execute manual sync
- `test-shopify-token` - Test token validity

---

## QC Photos

| Function | Parameters | Description |
|----------|------------|-------------|
| `upload_order_photo` | `p_order_id, p_store, p_url, p_stage, p_qc_status, p_qc_issue, p_qc_comments` | Save photo record |
| `get_order_photos` | `p_order_id, p_store` | Get photos for order |

---

## Messaging

### Conversations

| Function | Parameters | Description |
|----------|------------|-------------|
| `create_conversation` | `p_participants, p_name, p_type` | Create conversation (direct/group/broadcast) |
| `get_conversations` | `p_limit, p_offset` | List user's conversations |
| `get_conversation_participants` | `p_conversation_id` | List participants |
| `add_participant` | `p_conversation_id, p_user_id` | Add user to conversation |
| `remove_participant` | `p_conversation_id, p_user_id` | Remove user |

### Messages

| Function | Parameters | Description |
|----------|------------|-------------|
| `send_message` | `p_conversation_id, p_content` | Send message |
| `get_messages_temp` | `p_conversation_id, p_limit, p_offset` | Get messages |
| `mark_messages_read` | `p_conversation_id` | Mark conversation as read |
| `get_unread_count` | - | Total unread message count |

---

## Analytics

### Store Analytics

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_store_analytics` | `p_store, p_start_date, p_end_date` | Overview metrics (revenue, orders, avg value) |
| `get_revenue_by_day` | `p_store, p_start_date, p_end_date` | Daily revenue chart data |
| `get_top_products` | `p_store, p_start_date, p_end_date, p_limit` | Best-selling products |
| `get_weekly_forecast` | `p_store, p_week_start` | Order forecast by day |
| `get_delivery_breakdown` | `p_store, p_week_start` | Pickup vs delivery distribution |

### Staff Analytics

| Function | Parameters | Description |
|----------|------------|-------------|
| `get_staff_attendance_rate` | `p_days` | Attendance percentage |
| `get_staff_avg_productivity` | `p_days` | Orders per hour |
| `get_department_performance` | `p_days` | Stage throughput metrics |
| `get_staff_stage_performance` | `p_days` | Individual staff stage counts |

---

## RPC Response Envelope

All RPCs that return status use a consistent envelope:

```typescript
interface RPCResponse<T = any> {
  success: boolean;
  message: string | null;
  data: T | null;
  error_code: string | null;
}
```

---

## Frontend Client

All RPCs are wrapped in `src/lib/rpc-client.ts` with:

- TypeScript types for parameters and returns
- Error handling with retry logic for JWT expiration
- Automatic session refresh on auth errors

```typescript
import { getQueue, assignStaff, completeFilling } from '@/lib/rpc-client';

// Example usage
const orders = await getQueue({ store: 'bannos', stage: 'Filling' });
await assignStaff(orderId, 'bannos', staffId);
await completeFilling(orderId, 'bannos');
```

---

## Notes

- **Role validation** happens inside RPCs, not in client code
- **Idempotency**: repeat calls for same action return success without re-processing
- **Stage guards**: prevent invalid transitions (e.g., can't complete Covering before Filling)
- **Audit trail**: all stage transitions logged to `stage_events` table
