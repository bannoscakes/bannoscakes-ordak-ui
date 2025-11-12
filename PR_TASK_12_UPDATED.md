## What / Why

Fix Task 12 Shopify Integration by switching from Storefront API to Admin API and removing unnecessary catalog sync. BOMs already handle inventory, so product catalog sync is not needed. This PR corrects the API endpoints, token key, store URLs, and **fixes 3 critical bugs** discovered during review.

## Critical Bug Fixes (Added)

### Bug 1: Timezone Drift - Due Dates Appear Past Due ⏰
**Problem:** The `parseDueDateFromTags` function creates dates in UTC (via `new Date(dateString)`), but these are compared against `today` which is set in local time. This timezone mismatch causes orders due today to be incorrectly skipped as "past due" in negative UTC offset timezones.

**Example:** An order due "2025-11-14" parsed as UTC midnight would be considered past due when compared to Nov 14 local midnight in PST (-8 hours).

**Fix:** Changed `today.setHours(0, 0, 0, 0)` to `today.setUTCHours(0, 0, 0, 0)` to ensure consistent UTC comparison.

### Bug 2: Order Sync Fails Silently 🔇
**Problem:** The `sync_shopify_orders` RPC creates a sync run record and returns success, but never actually invokes the `sync-shopify-orders` Edge Function. Users see "Order sync started" messages but no orders are fetched from Shopify, leaving sync runs stuck in `running` status indefinitely.

**Fix:** Frontend now invokes the Edge Function after RPC call with `supabase.functions.invoke('sync-shopify-orders', { body: { store, token, run_id } })`.

### Bug 3: Token Test Incomplete - Validation Never Executes 🔐
**Problem:** The `test_admin_token` RPC creates a sync run record and returns success, but never invokes the `test-shopify-token` Edge Function. Users see success messages but token validation never actually happens.

**Fix:** Frontend now invokes the Edge Function after RPC call with `supabase.functions.invoke('test-shopify-token', { body: { store, token, run_id } })`.

## How to verify

1. **Apply migration:**
   ```bash
   supabase db reset
   # Or in production: supabase db push
   ```

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy test-shopify-token
   supabase functions deploy sync-shopify-orders
   ```

3. **Test token validation:**
   - Go to Settings page
   - Enter Admin API token (same as webhook token)
   - Click "Test Admin API Token"
   - Should show success with shop name (now actually validates!)
   - Check `shopify_sync_runs` - status should be 'success' not stuck in 'running'

4. **Test order sync:**
   - Click "Sync Orders"
   - Check `shopify_sync_runs` table - should complete with 'success' or 'error' status
   - Check `webhook_inbox_bannos` / `webhook_inbox_flourlane` for imported orders
   - Verify orders appear in production queues
   - **Timezone test:** Orders due today should NOT be skipped as past due

## Changes

### Database (Migration 063)
- ❌ Removed `connect_catalog()` - Not needed (BOMs handle inventory)
- ❌ Removed `test_storefront_token()` - Wrong API
- ✅ Added `test_admin_token()` - Validates Admin API token
- ✅ Fixed `sync_shopify_orders()` - Uses correct token key `'shopifyToken'`

### Edge Functions
- ✅ `test-shopify-token/index.ts` - Complete Admin API validation with shop query
- ✅ `sync-shopify-orders/index.ts` 
  - Fixed store URLs (bannos.myshopify.com, flour-lane.myshopify.com)
  - **Fixed timezone bug:** Use UTC midnight for date comparison

### Frontend (RPC Client)
- ✅ `testAdminToken()` - Now invokes Edge Function after RPC (Bug 3 fix)
- ✅ `syncShopifyOrders()` - Now invokes Edge Function after RPC (Bug 2 fix)
- ✅ Removed `connectCatalog()` function

### Settings Page UI
- ✅ Removed "Connect & Sync Complete Catalog" button
- ✅ Updated labels: "Admin API Token" instead of "Storefront Access Token"
- ✅ Updated descriptions: References Admin API and same token as webhooks

## Commits

1. **Initial Implementation** (978dbf0)
   - Switch to Admin API, remove catalog sync
   - Fix store URLs
   - Update UI labels

2. **Bug Fixes** (ff9ac43) ⭐
   - Fix timezone drift in date comparison
   - Fix order sync silent failure
   - Fix token test incomplete workflow

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally
- [x] All Cursor bot bugs fixed in same PR

## Files Changed
```
modified:   src/components/SettingsPage.tsx (catalog sync removed, labels updated)
modified:   src/lib/rpc-client.ts (Edge Function invocation added, testAdminToken, removed connectCatalog)
modified:   supabase/functions/sync-shopify-orders/index.ts (fixed store URLs, timezone bug)
modified:   supabase/functions/test-shopify-token/index.ts (complete Admin API validation)
new file:   supabase/migrations/063_fix_shopify_integration.sql (new RPCs)
new file:   TASK_12_FIX_COMPLETE.md (documentation)
```

## Impact
- ✅ Settings page now correctly uses Admin API for order sync
- ✅ Tokens saved with correct key (`'shopifyToken'`) matching webhooks
- ✅ No more confusing catalog sync (not needed with BOMs)
- ✅ Store URLs corrected (bannos.myshopify.com, flour-lane.myshopify.com)
- ✅ **Edge Functions actually execute** (bugs 2 & 3 fixed)
- ✅ **Timezone-safe date comparison** (bug 1 fixed)
- ✅ **No more stuck sync runs** (all complete with success/error)

## Refs
- Master_Task.md - Task 12
- TASK_12_FIX_COMPLETE.md (full implementation details)
- Cursor bot bug reports (3 critical bugs addressed)

