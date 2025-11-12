## What / Why

Create the `stage_events` table to enable production analytics, timeline views, and staff performance metrics. This replaces the old incompatible `stage_events` table and updates all completion/assignment RPCs to log events for analytics.

**Task 6 from Master_Task.md - Critical priority**

This change:
- Enables order timeline views (progression through stages)
- Enables staff performance metrics and reporting
- Unblocks Task 5 (print_barcode RPC)
- Powers future analytics dashboard

## How to verify

### 1. Apply migrations to dev database
```bash
supabase db push
# or manually apply:
# 052_stage_events_rebuild.sql
# 053_add_stage_events_logging.sql
```

### 2. Verify table created
```sql
-- Check table exists with correct schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stage_events';

-- Should have: id, store, order_id, stage, event_type, at_ts, staff_id, ok, meta
```

### 3. Test completion logging
```sql
-- Complete a test order through Filling stage
SELECT complete_filling('<test_order_id>', 'bannos', 'test notes');

-- Verify event logged
SELECT * FROM stage_events 
WHERE order_id = '<test_order_id>' 
ORDER BY at_ts DESC;

-- Should show: event_type = 'complete', stage = 'Filling', meta contains notes
```

### 4. Test assignment logging
```sql
-- Assign staff to an order
SELECT assign_staff('<test_order_id>', 'bannos', '<staff_uuid>');

-- Verify event logged
SELECT * FROM stage_events 
WHERE order_id = '<test_order_id>' AND event_type = 'assign';

-- Should show: event_type = 'assign', staff_id populated, meta contains assigned_to
```

### 5. Verify indexes created
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'stage_events';

-- Should show 4 indexes:
-- idx_stage_events_store_ts
-- idx_stage_events_store_stage_ts
-- idx_stage_events_staff_ts
-- idx_stage_events_order
```

### 6. Verify RLS enabled
```sql
-- As authenticated user, should be able to read
SELECT COUNT(*) FROM stage_events;

-- Direct insert should fail (RPC-only)
-- This should raise RLS policy violation:
INSERT INTO stage_events (store, order_id, stage, event_type) 
VALUES ('bannos', 'test', 'Filling', 'complete');
-- Expected: permission denied (RLS policy blocks direct writes)
```

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] Database changes are idempotent (can be run multiple times)
- [x] Backward compatible (still logs to audit_log)

## Files Changed

### New Files
- `supabase/migrations/052_stage_events_rebuild.sql` - Rebuild stage_events table
- `supabase/migrations/053_add_stage_events_logging.sql` - Update 5 RPCs to log events
- `TASK_6_IMPLEMENTATION_SUMMARY.md` - Complete documentation

### Modified Files
- `docs/Master_Task.md` - Mark Task 6 as complete, update progress stats

## Implementation Details

See `TASK_6_IMPLEMENTATION_SUMMARY.md` for:
- Complete schema documentation
- Example queries enabled by this change
- Testing checklist
- Design decisions and rationale

## Database Changes

**New Table:** `stage_events`
- 9 columns (id, store, order_id, stage, event_type, at_ts, staff_id, ok, meta)
- 4 indexes for performance
- RLS enabled (read-only for authenticated users)

**Updated Functions:** 5 RPCs
- `complete_filling` - Added stage_events logging
- `complete_covering` - Added stage_events logging
- `complete_decorating` - Added stage_events logging
- `complete_packing` - Added stage_events logging
- `assign_staff` - Added stage_events logging + audit_log (was missing)

## Breaking Changes

**None** - Fully backward compatible
- All RPCs maintain existing signatures
- Still log to audit_log in addition to stage_events
- No changes to return types

## Next Steps After Merge

1. Verify events populate correctly in production workflow
2. Build timeline view UI component
3. Proceed with Task 5 (print_barcode RPC) - now unblocked
4. Build analytics dashboard using stage_events data


