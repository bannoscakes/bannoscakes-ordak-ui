# PR: Add Staff Approval and Payroll Columns

## What / Why

**Task 10 from Master_Task.md:** Add missing columns to `staff_shared` table to enable staff approval workflow and hourly rate tracking for payroll.

**Problem:**
- Staff approval workflow cannot be implemented (no `approved` column)
- Payroll calculations blocked (no `hourly_rate` column)
- Task 13 (Time & Payroll RPCs) requires hourly_rate

**Solution:** Add two missing columns to staff_shared table.

## Changes

### 1. Database Migration: `057_add_staff_approval_columns.sql`

**Columns added to `staff_shared`:**

1. **`approved`** (boolean NOT NULL DEFAULT false)
   - Staff approval status
   - Defaults to `false` for new staff (requires explicit approval)
   - Admin toggles to approve/reject staff

2. **`hourly_rate`** (numeric(10,2) NULL)
   - Hourly wage for payroll calculations
   - Nullable (not all staff may have hourly rate set)
   - Precision (10,2) allows rates up to $99,999,999.99/hour

**Features:**
- Idempotent (`IF NOT EXISTS` clauses)
- Backward compatible
- Descriptive comments
- Optional auto-approve for existing staff (commented out)

### 2. Documentation Updates

**`docs/Master_Task.md`:**
- Task 10 marked as ✅ Done
- Added completion notes
- Updated progress: 9 of 20 tasks complete (45%)
- Tier 2 now at 60% complete

**`TASK_10_IMPLEMENTATION_SUMMARY.md`:**
- Full analysis and examples
- Security considerations
- UI recommendations for future PR
- Testing checklist

## How to verify

### 1. Apply migration to dev database

```bash
# Migration will run automatically on deploy
# Or manually in Supabase Dashboard SQL Editor
```

### 2. Verify columns exist

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'staff_shared'
  AND column_name IN ('approved', 'hourly_rate')
ORDER BY column_name;
-- Should return 2 rows:
-- approved: boolean, NO, false
-- hourly_rate: numeric, YES, NULL
```

### 3. Test approved default

```sql
-- Check existing staff (should all be false by default)
SELECT full_name, approved, hourly_rate
FROM staff_shared
ORDER BY full_name;
-- approved should be false for all (unless you uncommented auto-approve)
```

### 4. Test approval update

```sql
-- Approve a staff member
UPDATE staff_shared
SET approved = true
WHERE email = 'staff@example.com';

-- Verify
SELECT approved FROM staff_shared WHERE email = 'staff@example.com';
-- Should return true
```

### 5. Test hourly_rate

```sql
-- Set hourly rate
UPDATE staff_shared
SET hourly_rate = 25.50
WHERE email = 'staff@example.com';

-- Verify
SELECT full_name, hourly_rate 
FROM staff_shared 
WHERE hourly_rate IS NOT NULL;
-- Should show staff with rate 25.50
```

### 6. Test payroll calculation

```sql
-- Verify hourly_rate works in calculations
SELECT 
  full_name,
  hourly_rate,
  hourly_rate * 40 as weekly_pay_estimate
FROM staff_shared
WHERE hourly_rate IS NOT NULL;
```

### 7. Decision: Auto-approve existing staff?

**If you want existing staff to be auto-approved:**

Run this after the migration:
```sql
UPDATE public.staff_shared 
SET approved = true 
WHERE is_active = true;
```

This makes sense since existing staff are already working.

## Checklist

- [x] One small task only (Task 10: Add staff approval columns)
- [x] No direct writes from client; RPCs only (schema change only)
- [x] No secrets/keys leaked
- [x] Migration is idempotent (`IF NOT EXISTS`)
- [x] Backward compatible (nullable hourly_rate, default false for approved)
- [x] Documentation complete (Master_Task.md + TASK_10_IMPLEMENTATION_SUMMARY.md)
- [x] Enables Task 13 (Time & Payroll RPCs)

## Dependencies

**No dependencies** - Standalone schema change

**Unblocks:**
- Task 13: Time & Payroll RPCs (requires hourly_rate for calculations)

**Enables (future PRs):**
- Staff approval UI (toggle in Staff Page)
- Hourly rate management (Admin input)
- Payroll reports (wage calculations)
- Access control (block unapproved staff from workspace)

## Testing Notes

- Migration is safe to run on production (idempotent, backward compatible)
- Existing staff will have `approved = false` by default
- Existing staff will have `hourly_rate = NULL` by default
- **Decide:** Run auto-approve SQL for existing staff or approve manually via UI
- No performance impact

## Files Changed

1. `supabase/migrations/057_add_staff_approval_columns.sql` (new, 33 lines)
2. `docs/Master_Task.md` (updated Task 10 status + completion notes + progress)
3. `TASK_10_IMPLEMENTATION_SUMMARY.md` (new, comprehensive documentation)

**Total:** 3 files, ~200 insertions

## Future Work (Separate PRs)

**UI Updates needed (not in this PR):**
1. Staff Page - Add "Approved" column and toggle
2. Staff Page - Add "Hourly Rate" input (Admin only)
3. Staff Workspace - Block access if `approved = false`
4. Create `update_staff_approval` RPC
5. Create `set_staff_hourly_rate` RPC

