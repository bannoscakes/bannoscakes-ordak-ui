# feat: add inbox processor with image extraction

## What / Why
Implements a Supabase Edge Function to process webhooks from `webhook_inbox_bannos` and `webhook_inbox_flourlane` tables, extract order data using Liquid template logic, fetch product images from Shopify Admin API, apply order splitting rules, and populate `orders_bannos` and `orders_flourlane` tables.

## How to verify
1. Deploy function: `npx supabase functions deploy process-inbox`
2. Set environment variables in Supabase Dashboard:
   - `SHOPIFY_ADMIN_TOKEN` (Bannos)
   - `SHOPIFY_ADMIN_TOKEN_FLOURLANE` (Flourlane)
3. Call function to process Bannos orders:
   ```bash
   curl -X POST https://[project-ref].supabase.co/functions/v1/process-inbox \
     -H "Authorization: Bearer [anon-key]" \
     -H "Content-Type: application/json" \
     -d '{"store": "bannos", "limit": 5}'
   ```
4. Verify orders appear in `orders_bannos` with `product_image` populated
5. Repeat for Flourlane store

## Key Features
- ✅ Fixed table names to match actual database schema
- ✅ Store-specific processing (Bannos/Flourlane)
- ✅ Image fetching from Shopify Admin GraphQL API
- ✅ Order splitting logic (multi-cake orders → A, B, C suffixes)
- ✅ Accessories attached only to first order in split
- ✅ Liquid template extraction logic replicated in TypeScript
- ✅ Idempotency via `upsert` on order ID
- ✅ Marks webhooks as processed after successful processing

## Implementation Details
**Table Names Fixed:**
- `webhooks_inbox` → `webhook_inbox_bannos` / `webhook_inbox_flourlane`
- `orders_table_bannos` → `orders_bannos`
- `orders_table_flourlane` → `orders_flourlane`

**Removed:** `shop_domain` logic (tables already separated by store)

**Request Format:**
```json
{
  "store": "bannos",  // or "flourlane"
  "limit": 50         // optional, defaults to 50
}
```

**Response Format:**
```json
{
  "success": true,
  "store": "Bannos",
  "totalProcessed": 5,
  "successCount": 5,
  "failCount": 0,
  "results": [
    {
      "webhookId": "bannos-1234",
      "orderNumber": 1234,
      "success": true,
      "ordersCreated": 1,
      "orderIds": ["bannos-1234"]
    }
  ]
}
```

## Checklist
- [x] One small task only (inbox processor implementation)
- [x] No direct writes from client (Edge Function uses service key)
- [x] No secrets/keys leaked (uses environment variables)
- [x] TypeScript-valid Edge Function code
- [ ] Deploy and test with sample orders from both stores

