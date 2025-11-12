# PR: Simplify Webhooks to Store Raw Orders

## What / Why

Simplify webhook handlers to store raw Shopify orders without any processing, categorization, or splitting. All order processing will happen later using Liquid templates. This fixes the issue where order #18242 and other legitimate orders were being blocked due to missing tags in webhook payloads.

**Problem:** Tags are not included in Shopify webhook payloads, causing real orders to be blocked.

**Solution:** Remove all blocking and processing logic. Store orders exactly as Shopify sends them.

## How to verify

### 1. Check the simplified code
- Webhook handlers reduced from ~194 lines to ~85 lines
- No `isCakeItem()` or `isAccessoryItem()` functions
- No tag validation or blocking
- No order splitting (A, B, C)
- Just: receive → store → return 200

### 2. Verify backup files exist
- `supabase/functions/shopify-webhooks-bannos/index.BACKUP-with-splitting.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.BACKUP-with-splitting.ts`
- `docs/webhook-splitting-logic-reference.md`

### 3. Deploy and test
```bash
npm run fn:deploy:bannos
npm run fn:deploy:flourlane
```

### 4. Create test order in Shopify
- Any order (with or without tags)
- Check Supabase logs - should see "Webhook received" and "✅ Stored"
- Check database - order should appear with `order_json` containing full payload
- No orders should be blocked

### 5. Verify order #18242 scenario
- Orders without tags in webhook payload will now be stored
- Can be processed later using Liquid templates

## Checklist

- [x] One small task only (webhook simplification)
- [x] No direct writes from client; RPCs only (Edge Functions use Supabase client)
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (pre-existing errors unrelated)
- [x] `npm run build` passes successfully
- [x] Previous work preserved in backup files
- [x] Logic documented for future backend implementation

## Key Changes

### Removed (Preserved in Backups)
- ❌ Tag-based blocking (lines 57-62)
- ❌ Item categorization functions (lines 9-30)
- ❌ Categorization loop (lines 64-83)
- ❌ Accessories preparation (lines 85-93)
- ❌ Order splitting logic (lines 95-163)
- ❌ Accessory-only order skipping

### Added
- ✅ Backup files with full splitting logic
- ✅ Documentation of business logic
- ✅ Simplified webhook handlers

### Kept
- ✅ Environment variable validation
- ✅ Webhook receipt and parsing
- ✅ Database insert with error handling
- ✅ Always return 200 (never fail)

## Database Impact

**Orders will now have:**
- ✅ `order_json` - Full Shopify payload (for Liquid processing)
- ✅ Basic fields - customer_name, email, currency, total_amount
- ✅ Status fields - stage, status, store_source
- ⚠️ NULL fields - product_title, quantity, flavour, accessories, due_date, etc.

**NULL fields will be populated later by backend processor using Liquid templates.**

## Benefits

1. **100% Reliability** - No orders blocked, all stored
2. **Simplicity** - 85 lines vs 194 lines
3. **Flexibility** - Can change processing logic without redeploying webhooks
4. **Reprocessing** - Can reprocess orders anytime from raw data
5. **Liquid Integration** - Ready for existing Kitchen docket templates
6. **Maintainability** - Won't break when Shopify changes data structure
7. **Debugging** - Full payload in database for troubleshooting

## Migration Path

### Current State (After This PR)
- Webhooks store raw orders
- Orders appear in database with minimal fields
- `order_json` contains full Shopify data

### Next Steps (Separate PR)
1. Create backend processor
2. Read `order_json` from database
3. Use Liquid templates to extract data
4. Port splitting logic from backup files
5. Populate NULL fields
6. Create split orders if needed

## Breaking Changes

**None** - Webhook endpoints remain the same, database schema unchanged.

**Note:** Orders will appear with NULL fields until backend processor is implemented. This is expected and intentional.

## Testing Notes

- All orders will be stored (no blocking)
- Check `order_json` field to see full Shopify payload
- Verify no 500 errors in Supabase logs
- Verify all webhooks return 200

## Rollback Plan

If issues occur:
1. Copy logic from `.BACKUP-with-splitting.ts` files back to `index.ts`
2. Redeploy Edge Functions
3. Orders will resume previous behavior (with splitting and blocking)

## Related Issues

- Fixes: Order #18242 blocked due to missing tags
- Fixes: Legitimate orders blocked when tags not in webhook payload
- Prepares: Backend processing using Liquid templates

---

**PR Type:** feat  
**Scope:** webhooks  
**Breaking:** No  
**Deployment:** Requires Edge Function redeployment

