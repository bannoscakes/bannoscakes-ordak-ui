## What / Why

Implement `print_barcode` RPC to enable barcode printing functionality at any production stage. This RPC generates a complete JSON payload for thermal printers and logs every print event for analytics and audit trails.

**Task 5 from Master_Task.md - Critical priority**

This change:
- Enables ticket/barcode printing workflow
- Logs all prints to `stage_events` for tracking
- Provides complete order details in one API call
- Prepares for Filling stage timer (Task 8)

## How to verify

### 1. Apply migration to dev database
```bash
supabase db push
# or manually apply:
# 054_print_barcode_rpc.sql
```

### 2. Test successful print
```sql
-- Get a test order ID
SELECT id, shopify_order_number, stage FROM orders_bannos LIMIT 1;

-- Call print_barcode
SELECT print_barcode('bannos', '<order_id>');

-- Should return JSON payload like:
-- {
--   "order_number": 1234,
--   "order_id": "abc-123",
--   "product_title": "Chocolate Cake",
--   "size": "6 inch",
--   "due_date": "2025-11-10",
--   "customer_name": "John Doe",
--   "stage": "Filling",
--   "priority": "HIGH",
--   "barcode_content": "bannos-abc-123",
--   "printed_at": "2025-11-09T10:30:00Z",
--   "printed_by": "uuid-of-staff"
-- }
```

### 3. Verify event logging
```sql
-- Check that print event was logged
SELECT * FROM stage_events 
WHERE order_id = '<order_id>' 
AND event_type = 'print'
ORDER BY at_ts DESC 
LIMIT 1;

-- Should show:
-- - event_type = 'print'
-- - staff_id populated
-- - meta contains: {first_filling_print: true/false}
```

### 4. Test error cases
```sql
-- Invalid store (should raise exception)
SELECT print_barcode('invalid', 'abc');
-- Expected: ERROR: Invalid store: invalid

-- Non-existent order (should raise exception)
SELECT print_barcode('bannos', 'nonexistent');
-- Expected: ERROR: Order not found: nonexistent
```

### 5. Test Filling stage detection
```sql
-- Find order in Filling stage
SELECT id FROM orders_bannos WHERE stage = 'Filling' LIMIT 1;

-- Print it
SELECT print_barcode('bannos', '<filling_order_id>');

-- Check metadata flag
SELECT meta FROM stage_events 
WHERE order_id = '<filling_order_id>' 
AND event_type = 'print'
ORDER BY at_ts DESC LIMIT 1;

-- Should show: {"first_filling_print": true}
```

### 6. Test priority conversion
```sql
-- Test orders with different priorities
SELECT 
  id,
  priority,
  (print_barcode('bannos', id)->>'priority') as converted_priority
FROM orders_bannos 
LIMIT 3;

-- Should show:
-- priority 1 → "HIGH"
-- priority 0 → "MEDIUM"  
-- priority 2 → "LOW"
```

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] Database changes are idempotent (CREATE OR REPLACE)
- [x] Logs to stage_events (analytics)
- [x] Authentication required (auth.uid() check)
- [x] Input validation (store, order existence)

## Files Changed

### New Files
- `supabase/migrations/054_print_barcode_rpc.sql` - print_barcode RPC implementation
- `TASK_5_IMPLEMENTATION_SUMMARY.md` - Complete documentation

### Modified Files
- `docs/Master_Task.md` - Mark Task 5 as complete, update progress (Tier 1: 100% ✅)

## Implementation Details

See `TASK_5_IMPLEMENTATION_SUMMARY.md` for:
- Complete payload structure
- Event logging details
- Task 8 integration plan
- Testing procedures
- Frontend integration guide

## Database Changes

**New Function:** `print_barcode(p_store text, p_order_id text) RETURNS jsonb`

**What it does:**
1. Validates store parameter ('bannos' or 'flourlane')
2. Fetches order details from dynamic table
3. Logs print event to `stage_events`
4. Detects Filling stage prints (for future timer)
5. Converts priority to readable format
6. Returns JSON payload with all order details + barcode

**No table changes** - Uses existing tables only

## Breaking Changes

**None** - This is a new RPC, no existing functionality affected

## Dependencies

- ✅ Task 6 (stage_events table) - **COMPLETE**
- ⏸️ Task 8 (timestamp columns) - Will enhance with timer logic when complete

## Integration Notes

### Task 8 Preparation
When Task 8 adds timestamp columns, this RPC will automatically set `filling_start_ts` on first Filling print. The TODO comment is marked in the migration file at line 48-53.

### Frontend Integration
Frontend can call this RPC to get printer payload:

```typescript
const { data, error } = await supabase.rpc('print_barcode', {
  p_store: 'bannos',
  p_order_id: orderId
});

if (data) {
  // Send to thermal printer
  printTicket(data);
}
```

**UI locations to add:**
- Order Detail Drawer (print button)
- OrderCard menu (print option)
- Scanner interface (print after scan)

## Analytics Enabled

Every print creates a `stage_events` record:
- Track which orders get printed most
- Identify excessive reprints
- Staff print activity metrics
- Print frequency by stage

---

## 🎉 Milestone Achievement

**TIER 1: CRITICAL BLOCKERS — 100% COMPLETE** ✅

All 6 critical tasks are now done:
1. ✅ Update Order TypeScript Interface
2. ✅ Add Flavour Column to Orders Tables
3. ✅ Fix Stage Naming Drift in UI
4. ✅ Implement set_storage RPC
5. ✅ Implement print_barcode RPC
6. ✅ Create stage_events Table

**Overall Progress:** 30% (6 of 20 tasks complete)

