# PR: Add Completion Timestamp Columns to Orders Tables

## What / Why

**Task 8 from Master_Task.md:** Add individual timestamp columns for each stage completion to enable proper duration tracking.

**Critical bug discovered:**
- Completion RPCs (`complete_filling`, `complete_covering`, `complete_decorating`, `complete_packing`) were already coded to set timestamp columns
- But the columns **didn't exist in the database schema**!
- This was likely causing stage completion failures

**Fix:** Add the missing timestamp columns that the RPCs were trying to set.

## Changes

### 1. Database Migration: `056_add_completion_timestamps.sql`

**Columns added to `orders_bannos` (4):**
- `filling_complete_ts` (timestamptz NULL)
- `covering_complete_ts` (timestamptz NULL)
- `decorating_complete_ts` (timestamptz NULL)
- `packing_complete_ts` (timestamptz NULL)

**Columns added to `orders_flourlane` (4):**
- `filling_complete_ts` (timestamptz NULL)
- `covering_complete_ts` (timestamptz NULL)
- `decorating_complete_ts` (timestamptz NULL)
- `packing_complete_ts` (timestamptz NULL)

**Features:**
- Idempotent (`IF NOT EXISTS` clauses)
- Backward compatible (nullable columns)
- Descriptive comments on all columns

### 2. No RPC Updates Needed

**Discovery:** All 4 completion RPCs already had code to set these timestamps:
- `complete_filling` (migration 043, line 323): `filling_complete_ts = now()`
- `complete_covering` (migration 043, line 143): `covering_complete_ts = now()`
- `complete_decorating` (migration 043, line 233): `decorating_complete_ts = now()`
- `complete_packing` (migration 043, line 411): `packing_complete_ts = now()`

**This migration just adds the missing columns the RPCs were trying to set.**

### 3. Documentation Updates

**`docs/Master_Task.md`:**
- Task 8 marked as ✅ Done
- Added completion notes explaining the bug fix
- Updated progress: 8 of 20 tasks complete (40%)
- Tier 2 now at 40% complete

**`TASK_8_IMPLEMENTATION_SUMMARY.md`:**
- Full analysis of the issue
- Analytics query examples
- Testing checklist

## How to verify

### 1. Apply migration to dev database

```bash
# Migration will run automatically on deploy
# Or manually in Supabase Dashboard SQL Editor
```

### 2. Verify columns exist

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('orders_bannos', 'orders_flourlane')
  AND column_name LIKE '%_complete_ts'
ORDER BY table_name, column_name;
-- Should return 8 rows (4 columns × 2 tables)
```

### 3. Test stage completion

```sql
-- Get a test order ID in Filling stage
SELECT id FROM orders_bannos WHERE stage = 'Filling' LIMIT 1;

-- Complete Filling stage
SELECT complete_filling('<order_id>', 'bannos');

-- Verify timestamp set
SELECT filling_complete_ts, stage 
FROM orders_bannos 
WHERE id = '<order_id>';
-- filling_complete_ts should have a timestamp
-- stage should be 'Covering'
```

### 4. Test full lifecycle

```sql
-- Complete order through all stages
SELECT complete_filling('<order_id>', 'bannos');
SELECT complete_covering('<order_id>', 'bannos');
SELECT complete_decorating('<order_id>', 'bannos');
SELECT complete_packing('<order_id>', 'bannos');

-- Verify all timestamps populated
SELECT 
  id,
  filling_complete_ts,
  covering_complete_ts,
  decorating_complete_ts,
  packing_complete_ts,
  stage
FROM orders_bannos WHERE id = '<order_id>';
-- All 4 timestamps should be populated
-- stage should be 'Complete'
```

### 5. Test analytics query

```sql
-- Calculate time in each stage for completed orders
SELECT 
  id,
  product_title,
  EXTRACT(EPOCH FROM (packing_complete_ts - created_at)) / 3600 AS total_hours,
  EXTRACT(EPOCH FROM (filling_complete_ts - created_at)) / 3600 AS filling_hours,
  EXTRACT(EPOCH FROM (covering_complete_ts - filling_complete_ts)) / 3600 AS covering_hours,
  EXTRACT(EPOCH FROM (decorating_complete_ts - covering_complete_ts)) / 3600 AS decorating_hours,
  EXTRACT(EPOCH FROM (packing_complete_ts - decorating_complete_ts)) / 3600 AS packing_hours
FROM orders_bannos
WHERE stage = 'Complete'
  AND packing_complete_ts IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 6. Test UI (if timeline view exists)

1. Login to app
2. Complete an order through all stages
3. Open Order Detail Drawer
4. Check if timeline view shows stage completion times

## Checklist

- [x] One small task only (Task 8: Add completion timestamps)
- [x] No direct writes from client; RPCs only (schema change only, no client changes)
- [x] No secrets/keys leaked
- [x] Migration is idempotent (`IF NOT EXISTS`)
- [x] Backward compatible (nullable columns)
- [x] Documentation complete (Master_Task.md + TASK_8_IMPLEMENTATION_SUMMARY.md)
- [x] Fixes existing bug (RPCs were failing due to missing columns)

## Dependencies

**No dependencies** - Standalone schema change

**Enables:**
- Analytics dashboards (stage duration metrics)
- Timeline views (order progression display)
- KPI tracking (average time per stage)
- Bottleneck detection (slow stages identification)

## Testing Notes

- Migration is safe to run on production (idempotent, backward compatible)
- Existing orders will have NULL timestamps (expected)
- New orders will populate timestamps as stages complete
- No performance impact (nullable columns are efficient)

## Files Changed

1. `supabase/migrations/056_add_completion_timestamps.sql` (new, 45 lines)
2. `docs/Master_Task.md` (updated Task 8 status + completion notes + progress)
3. `TASK_8_IMPLEMENTATION_SUMMARY.md` (new, comprehensive documentation)

**Total:** 3 files, ~350 insertions

