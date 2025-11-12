## What / Why

Fix foreign key violation preventing Shopify Order Sync from working. The RPC tries to insert into `audit_log` table with `performed_by = auth.uid()`, but this violates a foreign key constraint causing sync to fail.

## Bug Details

**Error:**
```
Key (performed_by)=(ccb70029-5193-4af9-9b83-07d237850e7d) is not present in table "audit_log_performed_by_fkey"
```

**Root Cause:**
Migration 063 added audit_log insert to `sync_shopify_orders` RPC (lines 105-111):
```sql
INSERT INTO audit_log (action, performed_by, source, meta)
VALUES (
  'shopify_orders_sync_started',
  auth.uid(),  -- ❌ FK violation
  'sync_shopify_orders',
  jsonb_build_object('store', p_store, 'run_id', v_run_id)
);
```

The `performed_by` column has a foreign key constraint to a table that doesn't include the current user.

**The Fix:**
Remove the audit_log insert - it's redundant:
- ✅ `shopify_sync_runs` table already tracks all sync operations
- ✅ Includes: store, sync_type, status, timestamps, error_message
- ✅ More specific than generic audit_log
- ❌ audit_log insert not needed (causes FK violation)

## How to verify

1. **Apply migration:**
   ```bash
   # Run migration 064_fix_sync_audit_log_fkey.sql in Supabase
   ```

2. **Test sync:**
   - Go to Bannos Settings
   - Click "Sync Orders"
   - Should work without FK violation error

3. **Verify tracking:**
   ```sql
   SELECT * FROM shopify_sync_runs
   WHERE store = 'bannos' AND sync_type = 'sync_orders'
   ORDER BY started_at DESC LIMIT 1;
   ```
   Should show sync run record (tracking still works)

## Checklist
- [x] One small task only (remove redundant audit_log insert)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] Migration is idempotent (CREATE OR REPLACE)

## Files Changed
```
new file:   supabase/migrations/064_fix_sync_audit_log_fkey.sql
```

## Impact
- ✅ Sync Orders button works without FK violations
- ✅ Operations still tracked in shopify_sync_runs table
- ✅ No duplicate logging needed
- ✅ Cleaner, more specific tracking

## Refs
- User sync error in browser console
- Migration 063 lines 105-111
- SettingsPage.tsx line 320 error

