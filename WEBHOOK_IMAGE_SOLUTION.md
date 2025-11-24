# 🔍 WEBHOOK IMAGE INVESTIGATION - CONFIRMED FINDINGS

**Date:** November 16, 2025  
**Status:** ✅ INVESTIGATION COMPLETE - SOLUTION IDENTIFIED

---

## 📊 Confirmed Facts

### Database Investigation Results
- **Bannos:** 332 webhook orders - ❌ ZERO have images
- **Flourlane:** 578 webhook orders - ❌ ZERO have images
- **Checked:** Old and new orders - NO images anywhere in payloads
- **Searched:** Entire JSON for "image", "cdn.shopify", ".jpg", ".png" - NOT FOUND

### What's Actually in the Webhook Payload

```json
{
  "line_items": [{
    "id": 14075406811293,
    "title": "Cookies and Cream Gelato Cake",
    "product_id": 7477324021917,      // ✅ We have this
    "variant_id": 42630680117405,     // ✅ We have this
    "variant_title": "Large",
    "price": "135.00",
    // ❌ NO image field
    // ❌ NO image URL
    // ❌ NO variant object with image
    // ❌ NO product object with images
  }]
}
```

---

## 🎯 WHY This Happened

According to Shopify documentation and research:

### Possible Causes:

1. **API Version Change**
   - Shopify updated API versions
   - Newer versions may not include images by default
   - Your previous setup might have used older API

2. **Webhook Configuration Changed**
   - Webhooks in Shopify can be configured to include/exclude fields
   - Current configuration doesn't include images
   - Need to modify webhook subscription

3. **Protected Customer Data Access**
   - Images might require explicit permissions
   - App permissions may have changed
   - Need to grant access in Shopify Partner Dashboard

---

## ✅ SOLUTION OPTIONS

### Option A: Update Shopify Webhook Configuration (BEST IF POSSIBLE)

**If you can modify the webhook in Shopify Admin:**

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Edit the `orders/create` webhook
3. Check if there's an option to include product/variant data
4. Or update to GraphQL webhooks which allow field selection

**GraphQL Webhook Example:**
```graphql
subscription {
  orders {
    id
    lineItems {
      id
      title
      image {
        url
      }
      variant {
        image {
          url
        }
      }
    }
  }
}
```

**Pros:**
- Images automatically included in every webhook
- No additional API calls needed
- Best performance

**Cons:**
- Requires access to Shopify Admin
- May need to recreate webhook subscriptions
- Might need GraphQL webhooks (different setup)

---

### Option B: Fetch Images from Shopify Admin API (RECOMMENDED IF CAN'T MODIFY WEBHOOKS)

**How it works:**
1. Webhook arrives with `product_id` and `variant_id`
2. Edge Function makes API call to Shopify to get product data
3. Extract image URL from API response
4. Store in database with order

**Implementation Requirements:**
- Shopify Admin API Access Token for each store
- Store tokens in Supabase secrets
- Add image fetch logic to webhook functions

**Code Example:**
```typescript
// In webhook Edge Function
const productId = shopifyOrder.line_items?.[0]?.product_id;
const shopDomain = 'bannos.myshopify.com'; // or flourlane
const accessToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN_BANNOS');

const response = await fetch(
  `https://${shopDomain}/admin/api/2024-10/products/${productId}.json`,
  {
    headers: {
      'X-Shopify-Access-Token': accessToken
    }
  }
);

const { product } = await response.json();
const imageUrl = product?.image?.src || product?.images?.[0]?.src;
```

**Pros:**
- Works immediately with current webhook setup
- Gets actual product images
- Reliable

**Cons:**
- Requires API tokens
- Additional API call per webhook (rate limits)
- Slightly slower webhook processing

**Rate Limits:**
- Shopify Admin API: 40 requests/second
- Your webhook volume is well under this
- Should not be an issue

---

### Option C: Background Job to Fetch Images

**How it works:**
1. Webhook saves order (no image)
2. Separate Edge Function runs every 5-15 minutes
3. Finds orders without images
4. Fetches images in batches
5. Updates records

**Pros:**
- Doesn't slow down webhook processing
- Better for rate limiting (batched requests)
- Can retry failures

**Cons:**
- Images not immediately available
- More complex setup
- Requires cron job configuration

---

### Option D: Manual Product Image Mapping

**How it works:**
1. Create lookup table: `product_id` → `image_url`
2. Manually populate with images (one-time)
3. Webhook looks up image from table
4. No API calls needed

**Pros:**
- Fast (no external API calls)
- No rate limits
- Works immediately once populated

**Cons:**
- Manual work to populate
- Needs updates when products change
- Doesn't scale for new products

---

## 🎯 RECOMMENDED IMPLEMENTATION

**Step 1: Try Option A First** (Update Shopify Webhook Config)
- Check if webhooks can be configured to include images
- If yes → simplest solution
- If no → proceed to Step 2

**Step 2: Implement Option B** (Fetch from API)
- Get Shopify Admin API tokens for both stores
- Add tokens to Supabase secrets
- Update webhook functions to fetch images
- This is the most robust solution

**Step 3: If Rate Limits are a Concern** (Use Option C)
- Implement background job instead
- Fetches images asynchronously

---

## 📋 WHAT WE NEED FROM YOU

To proceed with implementation, please confirm:

1. **Can you modify Shopify webhook configuration?**
   - Do you have access to Shopify Admin for both stores?
   - Can you check if there's a way to include images in webhook payload?

2. **If we need to fetch from API (Option B):**
   - Do you have Shopify Admin API access tokens for both stores?
   - Store URLs:
     - Bannos: `{shop-name}.myshopify.com`
     - Flourlane: `{shop-name}.myshopify.com`

3. **Which solution do you prefer?**
   - Option A: Update webhook config (if possible)
   - Option B: Fetch from API during webhook
   - Option C: Background job to fetch images
   - Option D: Manual mapping table

---

## 🚀 NEXT STEPS

Once you provide the above information, I can:

1. Implement the chosen solution
2. Add database columns for images
3. Update webhook functions
4. Update processor to include images
5. Test with both stores

**Ready to proceed once you decide which option to use!**




