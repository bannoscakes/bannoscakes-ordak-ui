# 🎯 SOLUTION FOUND - Image Extraction Strategy

**Date:** November 16, 2025  
**Status:** ✅ SOLUTION IDENTIFIED - Ready to Implement

---

## 🔍 What We Discovered

By comparing the OLD Lovable webhook code with the CURRENT code, we found:

### OLD System (Lovable) - HAD IMAGES ✅

The old code used a **3-tier approach** to get product images:

```typescript
async function extractImageFromItem(item: any, storeSource: string) {
  // TIER 1: Check if image is in webhook payload
  if (item.image) {
    return item.image
  }
  
  // TIER 2: Check if product.featured_image is in webhook
  if (item.product && item.product.featured_image) {
    return item.product.featured_image
  }
  
  // TIER 3: Fetch from Shopify Admin GraphQL API
  const adminToken = storeSource === 'Flourlane' 
    ? Deno.env.get('SHOPIFY_ADMIN_TOKEN_FLOURLANE')
    : Deno.env.get('SHOPIFY_ADMIN_TOKEN');
    
  // Call Shopify GraphQL API to get images
  const response = await fetch(
    `https://${storeDomain}/admin/api/2025-01/graphql.json`,
    {
      headers: { 'X-Shopify-Access-Token': adminToken }
    }
  );
}
```

### CURRENT System - NO IMAGES ❌

```typescript
// Just saves raw payload - NO image extraction
const { error } = await supabase.from('webhook_inbox_bannos').upsert({
  id: `bannos-${shopifyOrder.order_number}`,
  payload: shopifyOrder,  // Full JSON but images not in it
  processed: false
});
```

---

## 🎯 Why Images are Missing

**ROOT CAUSE:** Shopify's `orders/create` webhook (REST Admin API) does NOT include:
- `line_items[].image`
- `line_items[].product.featured_image`
- Any image data

This is standard Shopify behavior for REST webhooks in recent API versions.

**YOUR OLD SOLUTION:** Fetch images from Shopify Admin API when they're not in the webhook.

---

## ✅ IMPLEMENTATION PLAN

### Step 1: Add Image Columns to Database

**Migration 1:** Add to inbox tables
```sql
ALTER TABLE webhook_inbox_bannos 
ADD COLUMN IF NOT EXISTS product_image_url text;

ALTER TABLE webhook_inbox_flourlane 
ADD COLUMN IF NOT EXISTS product_image_url text;
```

**Migration 2:** Add to orders tables
```sql
ALTER TABLE orders_bannos 
ADD COLUMN IF NOT EXISTS product_image_url text;

ALTER TABLE orders_flourlane 
ADD COLUMN IF NOT EXISTS product_image_url text;
```

### Step 2: Update Webhook Functions

Add the image extraction function (from old Lovable code) to both webhook Edge Functions:

```typescript
async function extractImageFromItem(
  item: any, 
  storeSource: 'Bannos' | 'Flourlane'
): Promise<string | null> {
  // PRIORITY 1: Check webhook for image
  if (item.image) {
    return item.image;
  }
  
  // PRIORITY 2: Check webhook for product.featured_image
  if (item.product?.featured_image) {
    return item.product.featured_image;
  }
  
  // PRIORITY 3: Fetch from Shopify Admin API
  const productId = item.product_id;
  if (!productId) return null;
  
  const adminToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN');
  const storeDomain = storeSource === 'Flourlane' 
    ? 'flour-lane.myshopify.com'
    : 'bannos.myshopify.com';
  
  if (!adminToken) {
    console.error('SHOPIFY_ADMIN_TOKEN not found');
    return null;
  }
  
  try {
    const shopifyProductId = `gid://shopify/Product/${productId}`;
    const query = `
      query getProductImages($id: ID!) {
        product(id: $id) {
          images(first: 1) {
            edges {
              node {
                originalSrc
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(
      `https://${storeDomain}/admin/api/2025-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({ query, variables: { id: shopifyProductId } }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const images = data.data?.product?.images?.edges || [];
      if (images.length > 0) {
        return images[0].node.originalSrc;
      }
    }
  } catch (error) {
    console.error('Failed to fetch image:', error);
  }
  
  return null;
}
```

### Step 3: Use Image Extraction in Webhook

```typescript
const shopifyOrder = JSON.parse(await req.text());

// Extract image from first line item
const firstItem = shopifyOrder.line_items?.[0];
const productImage = firstItem 
  ? await extractImageFromItem(firstItem, 'Bannos')  // or 'Flourlane'
  : null;

// Save to inbox with image
await supabase.from('webhook_inbox_bannos').upsert({
  id: `bannos-${shopifyOrder.order_number}`,
  payload: shopifyOrder,
  product_image_url: productImage,  // NEW!
  processed: false
});
```

### Step 4: Update Processor

When processor moves data from inbox → orders, include the image:

```typescript
INSERT INTO orders_bannos (
  ...,
  product_image_url
) 
SELECT 
  ...,
  product_image_url  -- Copy from inbox
FROM webhook_inbox_bannos
WHERE processed = false;
```

---

## 📋 REQUIREMENTS

### Environment Variables Needed:

- ✅ `SHOPIFY_ADMIN_TOKEN` - Single token for both stores (you confirmed this)
- ✅ Store domains hardcoded:
  - Bannos: `bannos.myshopify.com`
  - Flourlane: `flour-lane.myshopify.com`

---

## 🚀 READY TO IMPLEMENT

**Next Steps:**
1. Create database migrations
2. Update webhook Edge Functions with image extraction
3. Update processor to include images
4. Deploy and test

**Estimated Time:** 
- Migrations: 5 minutes
- Webhook updates: 15 minutes
- Processor update: 10 minutes
- Testing: 10 minutes

---

**CONFIRMED:** This is exactly how your old Lovable system worked, and it successfully got images!




