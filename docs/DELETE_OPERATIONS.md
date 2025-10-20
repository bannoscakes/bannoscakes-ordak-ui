# Delete Operations Guide

## Safe Deletion Process

**To delete an order:**
```javascript
// Use the admin RPC function - NEVER manual SQL
const { error } = await supabase.rpc('admin_delete_order', { 
  p_order_id: 'your-order-uuid' 
});
```

## Scripts Available

- `scripts/delete_order.LOCALONLY.mjs <order-uuid>` - Delete via RPC
- `scripts/check_orders.mjs` - List orders (read-only)

## What NOT to do

❌ **Never run manual SQL deletes**
❌ **Never soft-delete with `DELETED_*` placeholders**
❌ **Never hardcode service_role keys**

## What the RPC does

The `admin_delete_order` function safely:
1. Deletes from `stage_events`
2. Deletes from `work_queue` 
3. Deletes from `order_photos`
4. Deletes from `audit_log`
5. Deletes from `dead_letter`
6. Finally deletes from `orders`

This prevents orphaned records and maintains data integrity.
