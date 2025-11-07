# RPC Version 2 Additions - 2025-11-06

## Summary

Added **Version 2** functions for all scanner-related RPCs that were missing them. These new versions use the `p_store` parameter and work with `orders_bannos`/`orders_flourlane` tables instead of the old unified `public.orders` table.

## Why This Was Needed

The production database has TWO separate order tables:
- `orders_bannos` - Orders from Bannos store
- `orders_flourlane` - Orders from Flourlane store

The old `public.orders` unified table **no longer exists** in production.

Many RPCs were extracted with only Version 1 (using `public.orders`), which would fail in production. The frontend is already calling these functions with the `p_store` parameter, so Version 2 was required.

## Functions Updated

### Migration 042: Queue & Orders (`042_queue_orders.sql`)

1. **`get_order_for_scan(p_code text)`** - Version 2
   - **Change:** Now searches across BOTH `orders_bannos` and `orders_flourlane`
   - **Returns:** `jsonb` instead of `orders` row type
   - **Logic:** Tries ID match, barcode match, and shopify_order_number match in both tables

2. **`admin_delete_order(p_order_id text, p_store text)`** - Version 2
   - **Change:** Added `p_store` parameter
   - **Logic:** Uses dynamic table name (`orders_bannos` or `orders_flourlane`)
   - **Returns:** `boolean` instead of `void`

### Migration 043: Scanner & Stage Completion (`043_scanner_stage_completion.sql`)

3. **`handle_print_barcode(p_order_id text, p_store text, p_barcode text)`** - Version 2
   - **Change:** Added `p_store` parameter, uses dynamic table name
   - **Returns:** `boolean` instead of `orders` row type

4. **`start_packing(p_order_id text, p_store text)`** - Version 2
   - **Change:** Added `p_store` parameter, uses dynamic table name
   - **Returns:** `boolean` instead of `orders` row type

5. **`assign_staff_to_order(p_order_id text, p_store text, p_staff_id uuid)`** - Version 2
   - **Change:** Added `p_store` parameter, uses dynamic table name
   - **Returns:** `boolean` instead of `orders` row type

6. **`move_to_filling_with_assignment(p_order_id text, p_store text, p_staff_id uuid)`** - Version 2
   - **Change:** Added `p_store` parameter, uses dynamic table name
   - **Returns:** `boolean` instead of `orders` row type

7. **`qc_return_to_decorating(p_order_id text, p_store text, p_reason text)`** - Version 2
   - **Change:** Added `p_store` parameter, uses dynamic table name
   - **Returns:** `boolean` instead of `orders` row type

## Version 1 Functions Kept

Version 1 functions (using `public.orders`) are kept in the migrations for historical reference and backward compatibility. They are marked as "Version 1 of 2" and will not be used in production since the `public.orders` table doesn't exist.

## Frontend Compatibility

All Version 2 functions match the signatures that the frontend (`src/lib/rpc-client.ts`) is already calling:

```typescript
// Frontend already calls with p_store parameter:
await supabase.rpc('complete_filling', { p_order_id, p_store });
await supabase.rpc('handle_print_barcode', { p_barcode, p_order_id, p_store });
await supabase.rpc('start_packing', { p_order_id, p_store });
await supabase.rpc('qc_return_to_decorating', { p_order_id, p_store, p_notes });
// etc.
```

## Testing Required

Before deploying these migrations to production:

1. ✅ Verify all Version 2 functions are created
2. ⏳ Test scanner flow (barcode printing, stage completion)
3. ⏳ Test QC return flow
4. ⏳ Test staff assignment flow
5. ⏳ Test order search/scan functionality

## Related Files

- `supabase/migrations/042_queue_orders.sql` - Updated with 2 Version 2 functions
- `supabase/migrations/043_scanner_stage_completion.sql` - Updated with 5 Version 2 functions
- `src/lib/rpc-client.ts` - Frontend RPC client (already using correct signatures)

## Commit

```
feat: add Version 2 for all scanner functions

- Add Version 2 (with p_store) for handle_print_barcode
- Add Version 2 (with p_store) for start_packing
- Add Version 2 (with p_store) for assign_staff_to_order
- Add Version 2 (with p_store) for move_to_filling_with_assignment
- Add Version 2 (with p_store) for qc_return_to_decorating
- Add Version 2 (with p_store) for admin_delete_order
- Update get_order_for_scan to search across both stores (bannos + flourlane)

All Version 2 functions now use orders_bannos/orders_flourlane instead of public.orders
```

