## What / Why

Fix critical schema bugs in RPC migrations that would cause runtime errors in fresh environments:
1. **Schema drift:** Orders table stubs used `text` types instead of proper `stage_type` enum and `smallint` for priority
2. **Wrong INSERT schemas:** Stage completion functions used incorrect column names for `stage_events` and `audit_log` tables
3. **Missing validation:** Dynamic UPDATE statements lacked row count validation

## How to verify

### Schema drift fix (migration 040)
```sql
-- Check orders_bannos table definition
\d orders_bannos
-- Should show: stage stage_type, priority smallint
```

### Stage completion fixes (migration 043)
```sql
-- Verify complete_covering function
SELECT prosrc FROM pg_proc WHERE proname = 'complete_covering';
-- Should show:
--   - No INSERT INTO stage_events
--   - INSERT INTO audit_log with (action, performed_by, source, meta)
--   - GET DIAGNOSTICS v_rows_affected = ROW_COUNT after UPDATE
```

### Test in Supabase Preview
1. Create new Preview branch
2. Run migrations 037-049
3. Call `complete_covering('test-123', 'bannos', 'test note')`
4. Should succeed without SQLSTATE 42703 errors

## Checklist
- [x] One small task only (schema bug fixes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] Cherry-picked from feature branch commits
- [x] Fixes critical runtime errors identified after initial PR merge

