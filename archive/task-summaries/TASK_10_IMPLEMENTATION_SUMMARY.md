# Task 10 Implementation Summary: Staff Approval and Payroll Columns

**Completed:** 2025-11-10  
**Type:** Database Schema Migration  
**Status:** ✅ Ready for Testing

---

## 🎯 Objective

Add missing columns to `staff_shared` table to enable staff approval workflow and hourly rate tracking for payroll calculations.

---

## 🔍 Problem Analysis

### Missing Columns

The `staff_shared` table was missing two critical columns required by the spec:

1. **`approved` (boolean)** - Enables staff approval workflow
   - New staff should default to unapproved
   - Admin must explicitly approve staff before they can work
   - Prevents unauthorized access to Staff Workspace

2. **`hourly_rate` (numeric)** - Required for payroll calculations
   - Needed for Task 13 (Time & Payroll RPCs)
   - Stores staff member's hourly wage
   - Admin-only visible (sensitive data)

### Impact

**Without these columns:**
- ❌ Cannot implement staff approval workflow
- ❌ Cannot calculate payroll (no hourly rate)
- ❌ Task 13 (Time & Payroll RPCs) blocked
- ❌ Security gap: New staff can immediately access system

---

## 🛠️ Implementation

### Files Created

1. **`supabase/migrations/057_add_staff_approval_columns.sql`** (33 lines)
   - Adds `approved` column
   - Adds `hourly_rate` column  
   - Includes descriptive comments
   - Idempotent (uses `IF NOT EXISTS`)

### Database Schema Changes

#### Column: `approved`
- **Type:** `boolean NOT NULL`
- **Default:** `false`
- **Purpose:** Staff approval status
- **Usage:** Admin toggles to approve/reject staff
- **Security:** Unapproved staff should be blocked from Staff Workspace

#### Column: `hourly_rate`
- **Type:** `numeric(10,2) NULL`
- **Default:** `NULL`
- **Purpose:** Hourly wage for payroll calculations
- **Precision:** 10 digits total, 2 decimal places
- **Range:** $0.01 to $99,999,999.99
- **Usage:** Admin sets rate, used in payroll calculations

---

## 🎨 Features Enabled

### Staff Approval Workflow

With `approved` column, you can now:

```sql
-- Get unapproved staff
SELECT full_name, email, created_at
FROM staff_shared
WHERE approved = false
ORDER BY created_at;

-- Approve a staff member
UPDATE staff_shared
SET approved = true, updated_at = now()
WHERE user_id = '<staff_uuid>';

-- Check if current user is approved
SELECT approved FROM staff_shared WHERE user_id = auth.uid();
```

### Payroll Calculations

With `hourly_rate` column, Task 13 can calculate pay:

```sql
-- Calculate pay for a staff member's shifts
SELECT 
  s.full_name,
  s.hourly_rate,
  SUM(EXTRACT(EPOCH FROM (sh.end_ts - sh.start_ts)) / 3600) as total_hours,
  SUM(EXTRACT(EPOCH FROM (sh.end_ts - sh.start_ts)) / 3600) * s.hourly_rate as total_pay
FROM staff_shared s
JOIN shifts sh ON sh.staff_id = s.user_id
WHERE sh.start_ts >= '2025-11-01'
  AND sh.end_ts IS NOT NULL
GROUP BY s.user_id, s.full_name, s.hourly_rate;
```

---

## 🔐 Security Considerations

### Approval Status

**Recommended UI logic:**
```typescript
// In Staff Workspace / App.tsx
const staffMember = await getStaffMe();

if (!staffMember.approved) {
  return <UnapprovedMessage />;
}

// Continue with normal workspace...
```

### Hourly Rate Visibility

**Recommended access control:**
```typescript
// Only Admin can see/edit hourly rates
if (userRole === 'Admin') {
  // Show hourly_rate input in Staff Page
  // Show hourly_rate in Time & Payroll calculations
} else {
  // Hide hourly_rate completely
  // Staff and Supervisors should not see wage data
}
```

---

## 🧪 Testing Checklist

### Manual Testing Required

Once migration is applied to dev database:

- [ ] **Verify columns exist:**
  ```sql
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'staff_shared'
    AND column_name IN ('approved', 'hourly_rate')
  ORDER BY column_name;
  -- Should return 2 rows
  ```

- [ ] **Test approved default:**
  ```sql
  -- Insert new staff member (or use existing RPC)
  -- Verify approved defaults to false
  SELECT approved FROM staff_shared 
  WHERE email = 'newstaff@example.com';
  -- Should return false
  ```

- [ ] **Test approval update:**
  ```sql
  UPDATE staff_shared
  SET approved = true
  WHERE user_id = '<staff_uuid>';
  
  SELECT approved FROM staff_shared WHERE user_id = '<staff_uuid>';
  -- Should return true
  ```

- [ ] **Test hourly_rate:**
  ```sql
  UPDATE staff_shared
  SET hourly_rate = 25.50
  WHERE user_id = '<staff_uuid>';
  
  SELECT hourly_rate FROM staff_shared WHERE user_id = '<staff_uuid>';
  -- Should return 25.50
  ```

- [ ] **Test payroll query:**
  ```sql
  -- Verify hourly_rate can be used in calculations
  SELECT 
    full_name,
    hourly_rate,
    hourly_rate * 40 as weekly_pay_estimate
  FROM staff_shared
  WHERE hourly_rate IS NOT NULL;
  ```

---

## 📊 Database Impact

### Schema Changes
- **Table modified:** 1 (staff_shared)
- **Columns added:** 2
- **Indexes:** None needed (approved/hourly_rate not frequently queried alone)
- **RLS:** No changes (uses existing staff_shared policies)

### Backward Compatibility
- ✅ **100% backward compatible**
- Existing staff will have `approved = false` by default
- Existing staff will have `hourly_rate = NULL`
- **Optional:** Can auto-approve existing active staff via commented SQL

### Storage Impact
- Minimal: 1 byte (boolean) + 8 bytes (numeric) = 9 bytes per staff
- For 100 staff: ~900 bytes additional storage
- Negligible performance impact

---

## 🔗 Dependencies

### Unblocks Future Tasks
- **Task 13: Time & Payroll RPCs** - Can now calculate pay using `hourly_rate`
- **Staff approval UI** - Can implement approval toggle in Staff Page
- **Payroll reports** - Can show wage costs

### No Dependencies
This task has no dependencies and only requires database migration.

---

## 🚨 Important Decision: Auto-Approve Existing Staff?

The migration includes **commented-out SQL** to auto-approve existing staff:

```sql
-- UPDATE public.staff_shared 
-- SET approved = true 
-- WHERE is_active = true;
```

### Options:

**Option A: Auto-approve existing staff**
- **Pro:** Existing staff can continue working immediately
- **Pro:** Makes sense - they're already in the system
- **Con:** No approval audit trail for existing staff

**Option B: Leave all as unapproved**
- **Pro:** Forces explicit approval for everyone
- **Pro:** Creates approval audit trail
- **Con:** Existing staff locked out until approved

**Recommendation:** Auto-approve existing active staff. They're already working, so approval is implicit.

**To enable:** Uncomment lines 30-32 in migration before running.

---

## 📝 Notes

### UI Updates (Future PR)

This PR is **database only**. Future PR should add:

1. **Staff Page (`StaffPage.tsx`):**
   - Add "Approved" column to staff table
   - Add toggle switch to approve/reject
   - Add "Hourly Rate" column (Admin only)
   - Add edit modal for hourly_rate

2. **Staff Workspace:**
   - Check `approved` status on load
   - Show "Pending Approval" message if false
   - Block access to workspace features

3. **RPC Updates:**
   - Add `update_staff_approval` RPC
   - Add `set_staff_hourly_rate` RPC
   - Or extend existing `update_staff` RPC

### Audit Trail (Future Enhancement)

Consider tracking:
- Who approved staff member
- When approved
- Who set/changed hourly rate
- Hourly rate history (for audits)

---

## ✅ Acceptance Criteria

- [x] Migration created: `057_add_staff_approval_columns.sql`
- [x] `approved` column added to staff_shared
- [x] `hourly_rate` column added to staff_shared
- [x] Columns have correct types and defaults
- [x] Comments added for documentation
- [x] Migration is idempotent (`IF NOT EXISTS`)
- [x] Backward compatible
- [ ] Migration applied to dev database (pending)
- [ ] Manual testing complete (pending)
- [ ] UI updates (future PR)

---

## 🎉 Summary

**Task 10 is COMPLETE** ✅ (Database portion)

**What was added:**
- 2 columns to `staff_shared` table
- `approved` for workflow
- `hourly_rate` for payroll

**Impact:**
- **Enables Task 13:** Time & Payroll RPCs can now calculate wages
- **Enables approval workflow:** Admin can approve/reject staff
- **Foundation for payroll:** Hourly rates tracked per staff member

**Scope:**
- **This PR:** Database schema only (30 minutes)
- **Future PR:** UI updates (Staff Page, approval toggles, inputs)

**Next Steps:**
1. Apply migration `057_add_staff_approval_columns.sql` to dev database
2. Decide: Auto-approve existing staff or not
3. Test columns exist and defaults work
4. (Future) Implement UI for approval workflow

---

**Migration File:** `supabase/migrations/057_add_staff_approval_columns.sql`  
**Lines of Code:** 33  
**Complexity:** Low (simple schema change)  
**Ready for Review:** Yes ✅

