# Webhook Payload & Image Investigation Report

## 🔍 Investigation Summary

**Date**: 2025-01-XX  
**Issue**: Different payload JSON between bannos/flourlane webhooks + missing images

---

## Current State

### 1. Webhook Functions (Identical)

Both `shopify-webhooks-bannos` and `shopify-webhooks-flourlane` are **identical**:
- They only dump raw payload into `webhook_inbox_*` tables
- **NO extraction or processing** happens
- **NO image extraction** at all

**Files:**
- `supabase/functions/shopify-webhooks-bannos/index.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.ts`

### 2. Orders Table Schema

**Missing Image Column:**
```sql
-- Current orders_bannos/flourlane tables have NO image column
CREATE TABLE orders_bannos (
  id text PRIMARY KEY,
  shopify_order_id bigint,
  shopify_order_number integer,
  customer_name text,
  product_title text,
  -- ... other fields ...
  -- ❌ NO image_url or product_image column
);
```

### 3. Processing Pipeline

**Current Flow:**
```
Shopify Webhook → Edge Function → webhook_inbox_* (raw JSON)
                                        ↓
                                   [NO PROCESSOR]
                                        ↓
                                   ❌ Images Lost
```

**Expected Flow (from docs):**
```
Shopify Webhook → Extract from metafield → orders_* tables
```

But the current implementation **doesn't use metafields** - it just dumps raw payloads.

---

## Why Payloads Differ

### Possible Reasons:

1. **Shopify Store Configuration**
   - Different API versions
   - Different webhook event formats
   - Different product structures

2. **Product/Variant Structure**
   - Bannos might use different variant structure
   - Flourlane might have different metafields
   - Different image storage locations

3. **Webhook Payload Version**
   - Shopify Admin API vs GraphQL API
   - Different webhook topic versions

### How to Investigate:

**Query inbox tables to compare:**
```sql
-- Compare payload structures
SELECT 
  id,
  jsonb_pretty(payload->'line_items'->0) as first_line_item,
  jsonb_pretty(payload->'line_items'->0->'image') as image_data,
  jsonb_pretty(payload->'line_items'->0->'variant'->'image') as variant_image
FROM webhook_inbox_bannos 
LIMIT 1;

SELECT 
  id,
  jsonb_pretty(payload->'line_items'->0) as first_line_item,
  jsonb_pretty(payload->'line_items'->0->'image') as image_data,
  jsonb_pretty(payload->'line_items'->0->'variant'->'image') as variant_image
FROM webhook_inbox_flourlane 
LIMIT 1;
```

---

## Where Images Should Be in Shopify Webhooks

### Standard Locations:

1. **Line Item Level:**
   ```json
   {
     "line_items": [{
       "image": "https://cdn.shopify.com/...",
       "product_id": 123,
       "variant_id": 456
     }]
   }
   ```

2. **Product Level:**
   ```json
   {
     "line_items": [{
       "product": {
         "images": ["https://..."],
         "image": "https://..."
       }
     }]
   }
   ```

3. **Variant Level:**
   ```json
   {
     "line_items": [{
       "variant": {
         "image": "https://..."
       }
     }]
   }
   ```

4. **Properties (Custom):**
   ```json
   {
     "line_items": [{
       "properties": [{
         "name": "Product Image",
         "value": "https://..."
       }]
     }]
   }
   ```

### Why Images Might Be Missing:

1. **Shopify Webhook Configuration**
   - Webhook might not include image fields
   - Need to check webhook subscription settings

2. **API Version**
   - Older API versions might not include images
   - Need to use Admin API v2023-10+ for full image support

3. **Product Setup**
   - Products might not have images assigned
   - Variants might not have images

---

## Recommended Solutions

### Solution 1: Add Image Column + Extract During Processing

**Step 1: Migration - Add Image Column**
```sql
-- Migration: Add product_image_url to orders tables
ALTER TABLE orders_bannos 
ADD COLUMN product_image_url text;

ALTER TABLE orders_flourlane 
ADD COLUMN product_image_url text;
```

**Step 2: Update Webhook Processing**

Create/update processor to extract images:
```typescript
// Extract image from payload
function extractProductImage(lineItem: any): string | null {
  // Try multiple locations
  return lineItem.image || 
         lineItem.variant?.image || 
         lineItem.product?.image || 
         lineItem.product?.images?.[0] ||
         null;
}
```

**Step 3: Update Orders Table Insert**

When creating orders from webhook inbox, include image:
```sql
INSERT INTO orders_bannos (
  id,
  product_title,
  product_image_url,  -- NEW
  ...
) VALUES (
  ...,
  extractProductImage(payload->'line_items'->0)  -- Extract from payload
);
```

### Solution 2: Store Images in order_json (Quick Fix)

**No schema change needed:**
- Images are already in `order_json` (full payload)
- Extract on-demand in frontend
- Add helper function to get image from `order_json`

**Frontend Helper:**
```typescript
function getOrderImage(order: any): string | null {
  const orderJson = order.order_json;
  if (!orderJson?.line_items?.[0]) return null;
  
  const item = orderJson.line_items[0];
  return item.image || 
         item.variant?.image || 
         item.product?.image || 
         null;
}
```

### Solution 3: Use Shopify Admin API to Fetch Images

**If webhooks don't include images:**
- Store `product_id` and `variant_id` in orders table
- Fetch images on-demand via Shopify Admin API
- Cache images in database or CDN

---

## Action Items

### Immediate:

1. **Query inbox tables** to see actual payload structure:
   ```sql
   SELECT id, payload->'line_items'->0 FROM webhook_inbox_bannos LIMIT 1;
   SELECT id, payload->'line_items'->0 FROM webhook_inbox_flourlane LIMIT 1;
   ```

2. **Check webhook configuration** in Shopify Admin:
   - Verify webhook includes image fields
   - Check API version
   - Verify webhook topic format

3. **Compare payloads** side-by-side to identify differences

### Short-term:

1. **Add image column** to orders tables
2. **Update webhook processor** to extract images
3. **Test with sample orders** from both stores

### Long-term:

1. **Standardize webhook processing** for both stores
2. **Add image fallback logic** (try multiple locations)
3. **Cache images** to reduce API calls

---

## Questions to Answer

1. **Do webhook payloads actually contain images?**
   - Query inbox tables to verify

2. **Are images in different locations for each store?**
   - Compare payload structures

3. **Should we extract images during webhook processing or on-demand?**
   - Performance vs storage tradeoff

4. **Do we need to fetch images from Shopify Admin API?**
   - If webhooks don't include them

---

## Next Steps

1. Run investigation queries on inbox tables
2. Compare actual payload structures
3. Decide on solution approach
4. Implement image extraction
5. Test with both stores


