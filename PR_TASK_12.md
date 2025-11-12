## What / Why

Fix Task 12 Shopify Integration by switching from Storefront API to Admin API and removing unnecessary catalog sync. BOMs already handle inventory, so product catalog sync is not needed. This PR corrects the API endpoints, token key, and store URLs to match the actual Shopify configuration used by webhooks.

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
   - Should show success with shop name

4. **Test order sync:**
   - Click "Sync Orders"
   - Check `shopify_sync_runs` table for run record
   - Check `webhook_inbox_bannos` / `webhook_inbox_flourlane` for imported orders
   - Verify orders appear in production queues

## Changes

### Database (Migration 063)
- ❌ Removed `connect_catalog()` - Not needed (BOMs handle inventory)
- ❌ Removed `test_storefront_token()` - Wrong API
- ✅ Added `test_admin_token()` - Validates Admin API token
- ✅ Fixed `sync_shopify_orders()` - Uses correct token key `'shopifyToken'`

### Edge Functions
- ✅ `test-shopify-token/index.ts` - Complete Admin API validation with shop query
- ✅ `sync-shopify-orders/index.ts` - Fixed store URLs (bannos.myshopify.com, flour-lane.myshopify.com)

### Frontend
- ✅ RPC client: `testAdminToken()` replaces `testStorefrontToken()`, removed `connectCatalog()`
- ✅ SettingsPage: Removed "Connect & Sync Complete Catalog" button
- ✅ Updated labels: "Admin API Token" instead of "Storefront Access Token"
- ✅ Updated descriptions: References Admin API and same token as webhooks

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally
- [x] `npm run build` passes locally

## Files Changed
```
modified:   src/components/SettingsPage.tsx (catalog sync removed, labels updated)
modified:   src/lib/rpc-client.ts (testAdminToken, removed connectCatalog)
modified:   supabase/functions/sync-shopify-orders/index.ts (fixed store URLs)
modified:   supabase/functions/test-shopify-token/index.ts (complete Admin API validation)
new file:   supabase/migrations/063_fix_shopify_integration.sql (new RPCs)
new file:   TASK_12_FIX_COMPLETE.md (documentation)
```

## Impact
- ✅ Settings page now correctly uses Admin API for order sync
- ✅ Tokens saved with correct key (`'shopifyToken'`) matching webhooks
- ✅ No more confusing catalog sync (not needed with BOMs)
- ✅ Store URLs corrected (bannos.myshopify.com, flour-lane.myshopify.com)

## Refs
- Master_Task.md - Task 12
- TASK_12_FIX_COMPLETE.md (full implementation details)

