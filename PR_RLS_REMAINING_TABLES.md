# feat: enable RLS on remaining system tables

## What / Why

Complete RLS coverage by enabling Row-Level Security on remaining system tables that were flagged by Supabase Studio Advisor. This eliminates all "RLS Disabled in Public" warnings and ensures comprehensive database security.

**Tables protected:**
- `component_txns` - Inventory transaction history
- `processed_webhooks` - Webhook idempotency tracking
- `dead_letter` - Failed webhook queue
- `work_queue` - Background job queue
- `users` - Custom users table (if exists in public schema)

**Security model:**
- Admin: Can view system tables (debugging, monitoring)
- Supervisor/Staff: No access (internal system tables)
- Service Role: Bypasses RLS (Edge Functions, workers)

## How to verify

### Pre-deployment
```bash
npm run type-check  # Should pass (no code changes)
```

### Post-deployment

### Test 1: Verify RLS enabled on all tables

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('component_txns', 'processed_webhooks', 'dead_letter', 'work_queue')
ORDER BY tablename;
```
Expected: All show `rowsecurity = true`

### Test 2: Check Supabase Studio Advisor
- Navigate to Supabase Dashboard → Advisors
- Verify no more "RLS Disabled in Public" warnings
- Should only see "Security Definer View" warnings (legacy views, low priority)

### Test 3: Verify Admin can access system tables

```sql
-- Login as Admin in Supabase Studio
SELECT COUNT(*) FROM component_txns;
SELECT COUNT(*) FROM processed_webhooks;
SELECT COUNT(*) FROM dead_letter;
SELECT COUNT(*) FROM work_queue;
```
Expected: All queries succeed (service role bypasses RLS)

### Test 4: Verify Edge Functions still work
```bash
# Trigger webhook (create test order in Shopify)
# Expected: Order processed successfully
# Verify: No permission errors in Supabase logs
```

### Rollback if needed

```sql
-- Emergency rollback
ALTER TABLE component_txns DISABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_queue DISABLE ROW LEVEL SECURITY;
```

## Checklist

- [x] One small task only (RLS on remaining tables)
- [x] No direct writes from client; RPCs only (unchanged)
- [x] No secrets/keys leaked
- [x] `npm run type-check` not needed (SQL only)
- [x] Migration is idempotent (uses `DO $$` blocks)
- [x] Uses `current_user_role()` helper (consistent with migration 065)
- [x] Conditional checks for optional tables
- [x] GRANT statements included

## Files Changed

- **Added:** `supabase/migrations/066_rls_remaining_tables.sql` (260 lines)
  - Enables RLS on 5 remaining system tables
  - Admin-only SELECT policies
  - Blocks direct writes (service role only)
  - Conditional checks for optional tables

## Technical Notes

### Why These Tables Need RLS

**component_txns:**
- Contains sensitive inventory transaction history
- Shows stock levels and order relationships
- Admin-only access prevents Staff from reverse-engineering inventory

**processed_webhooks:**
- Contains webhook IDs and HMAC signatures
- Internal system table for idempotency
- Admin-only for debugging webhook issues

**dead_letter:**
- Contains failed webhook payloads (may include customer data)
- Admin-only for error investigation
- Prevents Staff from seeing failed orders

**work_queue:**
- Contains background job payloads
- Internal system table
- Admin-only for monitoring job status

**users:**
- Custom users table (if exists in public schema)
- auth.users is separate and managed by Supabase
- Admin can view all, users can view own record

### Why Service Role Bypasses RLS

Background workers and Edge Functions use service_role key which:
- Automatically bypasses ALL RLS policies
- Required for webhooks to write to `processed_webhooks`
- Required for workers to process `work_queue`
- Required for error logging to `dead_letter`
- No special policies needed - bypass is automatic

## Impact

**Before:**
- 5 system tables without RLS
- Supabase Studio Advisor showing warnings
- Staff could potentially query system tables via console

**After:**
- 100% RLS coverage on all public tables
- No Advisor warnings for missing RLS
- System tables Admin-only (except service role)
- Complete defense-in-depth security

## Related

- Migration 065 (Task 16): Enabled RLS on core tables
- Migration 058: Already has RLS on `inventory_items` and `inventory_transactions`
- This migration completes full RLS coverage

