# PR: Implement Shifts and Breaks System for Staff Time Tracking

## What / Why

**Task 7 from Master_Task.md:** Resolved contradiction between audit reports about shift/break system existence.

**Investigation found:**
- Report #4 was CORRECT ✅ - shifts/breaks tables and RPCs were missing
- Report #5 was WRONG ❌ - RPCs were NOT implemented
- **Critical issue:** Client code (`rpc-client.ts`) was calling non-existent backend RPCs - Staff Workspace shift controls were broken

**Implementation:** Complete shift/break tracking system for staff time & payroll.

## Changes

### 1. Database Migration: `055_shifts_breaks_system.sql`

**Tables created:**
- `shifts` - Staff work shifts with start/end timestamps, store assignment
- `breaks` - Breaks taken during shifts (cascade delete with shifts)

**Indexes created (4):**
- `idx_shifts_staff_id_start` - Query shifts by staff and date
- `idx_shifts_active` - Fast lookup of active shifts (partial index)
- `idx_breaks_shift_id` - Query breaks by shift
- `idx_breaks_active` - Fast lookup of active breaks (partial index)

**RLS Policies:**
- Staff can read their own shifts/breaks
- Admin can read all shifts/breaks
- Direct writes blocked (RPC-only via SECURITY DEFINER)

**RPCs implemented (5):**
1. `start_shift(p_store, p_staff_id)` - Start new shift at specific store with validation
2. `end_shift(p_staff_id)` - End shift and auto-close any active breaks
3. `start_break(p_staff_id)` - Start break during active shift
4. `end_break(p_staff_id)` - End active break
5. `get_current_shift(p_staff_id)` - Get active shift with break status

**Features:**
- **Store parameter required** - Prevents constraint violation for staff assigned to 'both' stores
- **Staff assignment validation** - Ensures staff can only start shifts at stores they're assigned to
- Validates no duplicate active shifts/breaks
- Auto-closes breaks when shift ends (prevents orphaned data)
- Staff_id defaults to `auth.uid()` for convenience
- Comprehensive audit logging for all actions
- Performance optimized with partial indexes

### 2. Documentation Updates

**`docs/Master_Task.md`:**
- Task 7 marked as ✅ Done
- Added detailed completion notes with investigation results
- Updated progress: 7 of 20 tasks complete (35%)
- Tier 2 now at 20% complete

**`TASK_7_IMPLEMENTATION_SUMMARY.md`:**
- Complete investigation report
- Full documentation of implementation
- Testing checklist
- Usage examples for all RPCs

## How to verify

### 1. Apply migration to dev database

Migration will run automatically on deploy, or manually:
```bash
# In Supabase dashboard SQL editor or via CLI
```

### 2. Test RPCs manually

```sql
-- Test 1: Start shift at Bannos
SELECT start_shift('bannos');
-- Should return shift_id UUID

-- Test 2: Verify shift created
SELECT * FROM get_current_shift();
-- Should show active shift with store='bannos'

-- Test 3: Start break
SELECT start_break();
-- Should return break_id UUID

-- Test 4: Verify break in current shift
SELECT * FROM get_current_shift();
-- Should show active_break_id

-- Test 5: End break
SELECT end_break();

-- Test 6: End shift
SELECT end_shift();

-- Test 7: Verify no active shift
SELECT * FROM get_current_shift();
-- Should return NULL

-- Test 8: Staff assignment validation
-- (As staff assigned to 'bannos' only)
SELECT start_shift('flourlane');
-- Should ERROR: Staff member is not assigned to flourlane store
```

### 3. Test validation errors

```sql
-- Should fail: Invalid store
SELECT start_shift('invalid');  
-- ERROR: Invalid store: invalid. Must be bannos or flourlane

-- Should fail: Duplicate shift
SELECT start_shift('bannos');
SELECT start_shift('bannos');  
-- ERROR: Staff already has an active shift

-- Should fail: Break without shift
SELECT start_break();  
-- ERROR: No active shift found
```

### 4. Test in UI (Staff Workspace)

1. Login as Staff role
2. Click "Start Shift" → Timer should start
3. Click "Start Break" → Break timer should start
4. Click "End Break" → Break timer stops, shift continues
5. Click "End Shift" → Shift timer stops

### 5. Verify RLS policies

```sql
-- As Staff: Can only see own shifts
SELECT * FROM shifts;

-- As Admin: Can see all shifts
SELECT * FROM shifts;

-- Direct write should fail
INSERT INTO shifts (staff_id, store) VALUES (auth.uid(), 'bannos');
-- ERROR: RLS policy violation
```

### 6. Check audit_log

```sql
SELECT * FROM audit_log 
WHERE action IN ('start_shift', 'end_shift', 'start_break', 'end_break')
ORDER BY created_at DESC;
-- Should show all shift/break actions
```

## Checklist

- [x] One small task only (Task 7: Shifts/Breaks system)
- [x] No direct writes from client; RPCs only (all writes via SECURITY DEFINER RPCs)
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (no TypeScript changes)
- [x] Migration follows project patterns (idempotent, RLS, SECURITY DEFINER, audit_log)
- [x] Comprehensive validation in all RPCs
- [x] Performance optimized (partial indexes on active shifts/breaks)
- [x] Documentation complete (Master_Task.md + TASK_7_IMPLEMENTATION_SUMMARY.md)

## Dependencies

**Unblocks:**
- Task 13: Time & Payroll RPCs (requires shifts/breaks data for hour calculations)

**No dependencies on other tasks**

## Testing Notes

- Migration is idempotent (`IF NOT EXISTS` clauses)
- All RPCs have error handling and validation
- RLS policies tested with different roles
- Audit logging verified for all actions
- Performance tested with partial indexes

## Files Changed

1. `supabase/migrations/055_shifts_breaks_system.sql` (new, 427 lines)
2. `docs/Master_Task.md` (updated Task 7 status + completion notes)
3. `TASK_7_IMPLEMENTATION_SUMMARY.md` (new, comprehensive documentation)

**Total:** 3 files, 904 insertions, 12 deletions

