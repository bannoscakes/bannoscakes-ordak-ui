# ⚠️ CRITICAL ISSUE DISCOVERED

## Problem Summary
The inbox processor was written to handle **REST API webhooks**, but the actual webhooks stored in the database are in **GraphQL format**. This is why all processing attempts are failing with "Unknown error" - the processor can't find the expected fields.

## Evidence

**Expected (REST format):**
```json
{
  "order_number": 12345,
  "line_items": [{ "title": "...", "product_id": "..." }],
  "customer": { "name": "John Doe" }
}
```

**Actual (GraphQL format in database):**
```json
{
  "name": "#B22588",
  "lineItems": {
    "edges": [
      { "node": {
          "title": "Peppa Pig Birthday Cake",
          "variant": { "id": "gid://shopify/ProductVariant/43914980262045" }
        }
      }
    ]
  },
  "customer": { "firstName": "Laura", "lastName": "Fleming" }
}
```

## Schema Verification Complete ✅

**Good News:**
- ✅ `product_image` column EXISTS in both `orders_bannos` and `orders_flourlane`
- ✅ Removed `accessories` column assignment (doesn't exist, not needed)

**Fixed Issues:**
- ✅ Fixed table names (`webhook_inbox_bannos`, `orders_bannos`, etc.)
- ✅ Fixed environment variable names (`SHOPIFY_ADMIN_TOKEN_BANNOS`)
- ✅ Removed non-existent `accessories` column

## Next Steps Required

### Option 1: Rewrite Processor for GraphQL Format (RECOMMENDED)
Adapt the processor to work with the GraphQL webhook structure that's actually in the database.

**Key Changes Needed:**
1. Extract `order_number` from `name` field (e.g., `"#B22588"` → `22588`)
2. Navigate `lineItems.edges[].node` instead of `line_items[]`
3. Extract product ID from GraphQL GID format (`gid://shopify/ProductVariant/XXX`)
4. Combine `customer.firstName` + `customer.lastName`
5. Handle nested `totalPriceSet.shopMoney.amount` instead of `total_price`

### Option 2: Change Webhooks to REST Format
Reconfigure Shopify webhooks to send REST format instead of GraphQL format.

**Not Recommended Because:**
- Would require changing webhook configuration in Shopify
- Existing 1364 webhooks in database are already in GraphQL format
- Would need to reprocess all existing webhooks

## Recommendation

**Go with Option 1**: Rewrite the processor to handle GraphQL webhooks.

This makes sense because:
1. The webhooks are already in this format
2. No changes needed in Shopify configuration  
3. Can process all 1364 existing webhooks immediately
4. GraphQL webhooks are Shopify's recommended modern format

## Status

- ✅ Branch created: `feature/inbox-processor`
- ✅ Processor deployed (but needs GraphQL adaptation)
- ✅ Schema verified
- ✅ All column issues fixed
- ❌ **Processor fails because it expects REST format, gets GraphQL format**

## Files Ready

- `PR_DESCRIPTION_INBOX_PROCESSOR.md` - Needs updating to reflect GraphQL format
- `PROCESSOR_READY_TO_DEPLOY.md` - Deployment guide (needs updating)
- `supabase/functions/process-inbox/index.ts` - **NEEDS REWRITE for GraphQL**

---

**Awaiting your decision:** Should I rewrite the processor to handle GraphQL webhooks?

