# 🔍 WEBHOOK IMAGE INVESTIGATION - FINAL FINDINGS

**Date:** November 16, 2025  
**Status:** ❌ IMAGES NOT IN WEBHOOK PAYLOADS

---

## 📊 Investigation Results

### Database Status
- **Bannos:** 332 webhook orders
- **Flourlane:** 578 webhook orders

### Actual Line Item Structure (Both Stores)

```json
{
  "id": 14075406811293,
  "title": "Cookies and Cream Gelato Cake",
  "product_id": 7477324021917,
  "variant_id": 42630680117405,
  "variant_title": "Large",
  "price": "135.00",
  "quantity": 1,
  "properties": [
    {
      "name": "_LocalDeliveryID",
      "value": "..."
    }
  ]
  // ❌ NO IMAGE FIELD
  // ❌ NO IMAGE URL
  // ❌ NO IMAGE DATA ANYWHERE
}
```

### Key Finding: NO IMAGES IN WEBHOOKS

**Checked locations:**
- ❌ `line_items[].image` - Does not exist
- ❌ `line_items[].variant.image` - Variant object not included
- ❌ `line_items[].product.image` - Product object not included  
- ❌ Top-level order fields - No images there either

**What we DO have:**
- ✅ `product_id` - Can use to fetch image from Shopify API
- ✅ `variant_id` - Can use for variant-specific images
- ✅ `title` and `variant_title` - For display fallback

---

## 🎯 Root Cause

**Shopify's `orders/create` webhook does NOT include product images by default.**

This is standard Shopify behavior. The webhook includes:
- Order metadata
- Line item IDs and prices
- Customer information
- **But NOT product images, descriptions, or full product data**

---

## ✅ SOLUTION OPTIONS

### Option 1: Fetch Images from Shopify Admin API (RECOMMENDED)

**How it works:**
1. Webhook arrives → save to inbox (as now)
2. Webhook function makes additional API call to Shopify
3. Fetch product image using `product_id`
4. Store image URL in inbox table
5. Processor copies image to orders table

**Implementation:**
```typescript
// In webhook Edge Function
const shopifyOrder = JSON.parse(await req.text());
const productId = shopifyOrder.line_items?.[0]?.product_id;

let productImageUrl = null;
if (productId) {
  // Fetch product from Shopify Admin API
  const response = await fetch(
    `https://{shop}.myshopify.com/admin/api/2024-10/products/${productId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': Deno.env.get('SHOPIFY_ADMIN_API_TOKEN')
      }
    }
  );
  
  if (response.ok) {
    const data = await response.json();
    productImageUrl = data.product?.image?.src || 
                     data.product?.images?.[0]?.src || 
                     null;
  }
}

// Save to inbox with image
await supabase.from('webhook_inbox_bannos').upsert({
  id: `bannos-${shopifyOrder.order_number}`,
  payload: shopifyOrder,
  product_image_url: productImageUrl,
  processed: false
});
```

**Pros:**
- Gets actual product images
- Works immediately for new orders
- No need for separate sync job

**Cons:**
- Requires Shopify Admin API access token
- Additional API call per webhook (rate limits)
- Webhook processing takes slightly longer

---

### Option 2: Background Job to Fetch Images

**How it works:**
1. Webhook arrives → save to inbox (no image)
2. Separate background job runs periodically
3. Job queries inbox rows without images
4. Fetches images from Shopify API in batches
5. Updates inbox rows with images

**Implementation:**
```typescript
// Separate Edge Function: fetch-product-images
const { data: orders } = await supabase
  .from('webhook_inbox_bannos')
  .select('id, payload')
  .is('product_image_url', null)
  .limit(50);

for (const order of orders) {
  const productId = order.payload.line_items?.[0]?.product_id;
  const imageUrl = await fetchProductImage(productId);
  
  await supabase
    .from('webhook_inbox_bannos')
    .update({ product_image_url: imageUrl })
    .eq('id', order.id);
}
```

**Pros:**
- Doesn't slow down webhook processing
- Can batch requests (better for rate limits)
- Can retry failed fetches

**Cons:**
- Images not immediately available
- More complex architecture
- Need to set up cron job

---

### Option 3: Manual Product Image Mapping Table

**How it works:**
1. Create `product_images` table mapping `product_id` → `image_url`
2. Manually populate with images from Shopify (one-time)
3. Webhook looks up image from mapping table
4. Update mapping table when products change

**Implementation:**
```sql
CREATE TABLE product_images (
  product_id bigint PRIMARY KEY,
  image_url text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert mappings
INSERT INTO product_images VALUES
  (7477324021917, 'https://...cookies-cream-cake.jpg'),
  (7760684187805, 'https://...rainbow-funfetti.jpg'),
  ...
```

```typescript
// In webhook function
const productId = shopifyOrder.line_items?.[0]?.product_id;
const { data } = await supabase
  .from('product_images')
  .select('image_url')
  .eq('product_id', productId)
  .single();

const productImageUrl = data?.image_url || null;
```

**Pros:**
- Fast lookups (no external API calls)
- No rate limit concerns
- Full control over images

**Cons:**
- Manual maintenance required
- Need initial data population
- Images can become stale
- Doesn't scale for new products

---

### Option 4: Use Placeholder/Generic Images

**How it works:**
1. Don't fetch real images
2. Use generic cake images based on product type
3. Map product titles to image categories

**Implementation:**
```typescript
function getGenericImage(productTitle: string): string {
  if (productTitle.includes('Gelato')) {
    return 'https://cdn.example.com/gelato-cake-generic.jpg';
  }
  if (productTitle.includes('Wedding')) {
    return 'https://cdn.example.com/wedding-cake-generic.jpg';
  }
  return 'https://cdn.example.com/default-cake.jpg';
}
```

**Pros:**
- Simple to implement
- No external dependencies
- Fast

**Cons:**
- Not real product images
- Less useful for staff
- Doesn't meet requirement

---

## 🎯 RECOMMENDED SOLUTION

**Option 1: Fetch from Shopify Admin API during webhook processing**

### Why?
1. Gets actual product images
2. Works immediately (no delay)
3. Simple architecture (no background jobs)
4. Images available when order is processed

### Requirements:
- Shopify Admin API access token for each store
- Store tokens as environment variables:
  - `SHOPIFY_ADMIN_API_TOKEN_BANNOS`
  - `SHOPIFY_ADMIN_API_TOKEN_FLOURLANE`
- Handle rate limiting gracefully

### Implementation Steps:
1. **Add columns to tables** (migrations)
2. **Get Shopify API tokens** (from Shopify admin)
3. **Update webhook functions** (add image fetch logic)
4. **Add error handling** (fallback if API fails)
5. **Update processor** (copy image to orders)

---

## 🚨 CRITICAL BLOCKER

**To proceed, we need:**

1. **Shopify Admin API Access Tokens** for both stores
   - Bannos store API token
   - Flourlane store API token
   
2. **Store URLs:**
   - Bannos: `{shop-name}.myshopify.com`
   - Flourlane: `{shop-name}.myshopify.com`

**Without API tokens, we cannot fetch product images.**

---

## 📋 NEXT STEPS

Please provide:
1. Do you have Shopify Admin API access tokens?
2. Which solution do you prefer (1, 2, 3, or 4)?
3. If Option 1: Can you provide the API tokens and store URLs?
4. If Option 2 or 3: Should I implement that instead?

Once confirmed, I can implement the chosen solution.




