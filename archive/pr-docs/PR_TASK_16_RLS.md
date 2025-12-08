# feat: enable RLS with role-based access control

## What / Why

Enable Row Level Security (RLS) on all database tables to add defense-in-depth security at the database layer. This prevents unauthorized data access even if UI security is bypassed (e.g., developer console, compromised credentials).

**Security Model:**
- **Admin:** Full access to all tables (SELECT/UPDATE/DELETE)
- **Supervisor:** View/manage all orders, read-only settings
- **Staff:** View/update assigned orders only, no access to settings/audit logs
- **Service Role:** Automatically bypasses RLS (Edge Functions, webhooks)

**Why this matters:**
- Protects API tokens in `settings` table (only Admin can see)
- Makes audit log tamper-proof (no deletes, Admin read-only)
- Prevents Staff from viewing unassigned orders via console
- Limits damage from compromised Staff accounts

## How to verify

### Pre-deployment Checks
1. Verify migration syntax: `psql -f supabase/migrations/065_enable_rls.sql --dry-run` (optional)
2. Check no TypeScript errors: `npm run type-check` (pre-existing errors OK)

### Post-deployment Testing

**Test 1: Admin Access (Full Access)**
```sql
-- Login as Admin in Supabase Studio
SELECT * FROM orders_bannos;  -- Should see ALL orders
SELECT * FROM settings;        -- Should see ALL settings (including API tokens)
SELECT * FROM audit_log;       -- Should see ALL audit logs
```

**Test 2: Supervisor Access**
```sql
-- Login as Supervisor
SELECT * FROM orders_bannos;  -- Should see ALL orders
SELECT * FROM settings;        -- Should see ALL settings (read-only)
```

**Test 3: Staff Access (Assigned Only)**
```sql
-- Login as Staff
SELECT * FROM orders_bannos;  -- Should see ONLY assigned orders
SELECT * FROM settings;        -- Should return EMPTY (blocked)
SELECT * FROM audit_log;       -- Should return EMPTY (blocked)
```

**Test 4: Scanner Operations (CRITICAL!)**
```bash
# Login as Staff in production UI
# Scan barcode for assigned order
# Expected: Stage completes successfully (Filling → Covering)
# Verify: staff_shared.assignee_id matches auth.uid()
```

**Test 5: Edge Functions (Service Role Bypass)**
```bash
# Trigger webhook (create test order in Shopify)
# Expected: Order inserted to webhook_inbox_bannos
# Expected: Order processed to orders_bannos
# Verify: No permission errors in Supabase logs
```

**Test 6: Developer Console Attack Prevention**
```javascript
// Login as Staff, open browser console (F12)
const { data } = await supabase.from('orders_bannos').select('*');
console.log(data); 
// Expected: Only assigned orders (not all 50 orders)

const { data: tokens } = await supabase.from('settings').select('*');
console.log(tokens);
// Expected: Empty array [] (RLS blocks access)
```

### Rollback if Needed

If scanner or critical functionality breaks:

```sql
-- Emergency rollback (disables RLS)
ALTER TABLE orders_bannos DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders_flourlane DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
```

## Checklist

- [x] One small task only (RLS enablement)
- [x] No direct writes from client; RPCs only (unchanged)
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes (pre-existing errors only)
- [x] Migration is idempotent (uses `DO $$` blocks)
- [x] Uses inline role checks (consistent with migrations 055, 058)
- [x] Staff can UPDATE assigned orders (scanner RPCs need this)
- [x] Service role bypasses RLS automatically (Edge Functions work)
- [x] Comprehensive comments in migration file

## Files Changed

- **Added:** `supabase/migrations/065_enable_rls.sql` (480 lines)
  - Enables RLS on 15+ tables
  - Creates 40+ policies with role-based logic
  - Fixes conflicting policy on `staff_shared`
  - Includes verification queries

## Security Impact

**Before:**
- Any logged-in user can query any table via console
- API tokens visible to all authenticated users
- Audit logs can be deleted
- No database-level access control

**After:**
- Admin: Full access (expected)
- Supervisor: Manage orders, read-only settings
- Staff: Assigned orders only, no settings/audit access
- Compromised Staff account = limited damage

**Attack Scenarios Prevented:**
1. ✅ Staff cannot see unassigned orders
2. ✅ Staff cannot view Shopify API tokens
3. ✅ Staff cannot delete audit trail
4. ✅ Staff cannot modify other user accounts
5. ✅ External hacker with Staff credentials = contained damage

## Technical Notes

### SECURITY DEFINER vs RLS (Important!)
- **SECURITY DEFINER** = Function runs with elevated privileges
- **RLS** = Still applies based on `auth.uid()`
- Scanner RPCs use `auth.uid()` → Need Staff UPDATE policy
- Edge Functions use service role → Automatically bypass RLS

### Why Staff Needs UPDATE Permission
Scanner RPCs (`complete_filling`, `complete_covering`, etc.) are SECURITY DEFINER but:
1. They run **as the logged-in user** (`auth.uid()`)
2. RLS **still applies** based on that user
3. Staff must have UPDATE permission on assigned orders
4. Business logic validation happens in RPC (not bypassed)

### Consistency with Existing Code
Uses inline role checks to match existing RLS patterns:
- `055_shifts_breaks_system.sql` - Already uses inline checks
- `058_inventory_foundation.sql` - Already uses inline checks
- This migration follows same pattern for consistency

## Related Tasks

- **Master_Task.md - Task 16:** Enable RLS Policies ✅
- **Future:** Add column-level RLS if needed (more granular control)
- **Future:** Add RLS policies for new tables as they're created

## Migration Safety

- ✅ **Idempotent:** Uses `DO $$` blocks, safe to re-run
- ✅ **Non-breaking:** Adds restrictions, doesn't change data
- ✅ **Fast:** < 1 second execution (just DDL)
- ✅ **Rollback-safe:** Simple ALTER TABLE commands to disable
- ✅ **Tested pattern:** Uses same logic as existing RLS (055, 058)

## Additional Context

This completes the security model started in migrations 052, 055, and 058. Those migrations enabled RLS on:
- `stage_events`
- `shifts`, `breaks`
- `inventory_items`, `inventory_transactions`

This migration extends RLS to remaining tables for comprehensive database security.

---

**Deployment:** Apply via Supabase Studio or `supabase db push`  
**Testing:** Follow verification steps above  
**Support:** Check Supabase logs for permission errors if issues arise

