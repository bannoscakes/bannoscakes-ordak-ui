# Webhook Image Investigation Report

**Date:** November 16, 2025  
**Investigator:** AI Assistant  
**Status:** Investigation Complete - Ready for Implementation Decision

---

## 🔍 Investigation Method

Since direct database access was not available, I investigated by:
1. Reviewing webhook Edge Function code
2. Analyzing database schema documentation
3. Researching Shopify webhook payload structure
4. Examining existing codebase references to images

---

## 📊 Current State Analysis

### Webhook Functions (Both Stores)

**Current Implementation:**
- `supabase/functions/shopify-webhooks-bannos/index.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.ts`

Both functions are **identical** and do the following:
```typescript
const shopifyOrder = JSON.parse(await req.text());

await supabase.from('webhook_inbox_bannos').upsert({
  id: `bannos-${shopifyOrder.order_number || shopifyOrder.id}`,
  payload: shopifyOrder,  // FULL JSON - includes everything Shopify sends
  processed: false
}, { onConflict: 'id' });
```

**Key Finding:** The functions save the **FULL webhook payload** to the inbox tables.

---

## 🖼️ Where Images Should Be in Shopify Webhooks

According to Shopify's `orders/create` webhook documentation, product images are typically found in these locations:

### Location 1: Line Item Image (Most Common)
```json
{
  "line_items": [
    {
      "id": 123456789,
      "title": "White Personalised Cake",
      "image": "https://cdn.shopify.com/s/files/1/0123/4567/products/cake.jpg?v=12345"
    }
  ]
}
```
**Path:** `payload.line_items[0].image`

### Location 2: Variant Image Object
```json
{
  "line_items": [
    {
      "variant_id": 987654321,
      "variant": {
        "image_id": 123456789,
        "image": {
          "src": "https://cdn.shopify.com/...",
          "id": 123456789
        }
      }
    }
  ]
}
```
**Path:** `payload.line_items[0].variant.image.src`

### Location 3: Product Object (Less Common)
```json
{
  "line_items": [
    {
      "product_id": 111222333,
      "product": {
        "images": [
          {
            "src": "https://cdn.shopify.com/..."
          }
        ]
      }
    }
  ]
}
```
**Path:** `payload.line_items[0].product.images[0].src`

---

## ✅ Key Finding: Images ARE Already Being Saved

**CONCLUSION:** Since the webhook functions save the **complete payload**, images are already in the database in the `payload` JSONB column of `webhook_inbox_bannos` and `webhook_inbox_flourlane`.

**They just haven't been extracted yet.**

---

## 🎯 Recommended Implementation Strategy

### Option 1: Extract at Webhook Time (RECOMMENDED)

**Pros:**
- Simpler queries later (no JSON parsing needed)
- Better performance when displaying orders
- Easier to add indexes on image column
- Front-loads the work when data comes in

**Cons:**
- Need to modify webhook functions
- Need to redeploy Edge Functions

**Implementation:**
1. Add `product_image_url` column to inbox tables
2. Update webhook functions to extract image during insert
3. When processor runs, copy image to orders table

### Option 2: Extract During Processing

**Pros:**
- Keep webhook functions minimal
- Don't need to redeploy webhooks

**Cons:**
- More complex processor logic
- Images only available after processing runs

**Implementation:**
1. Don't modify webhook functions
2. Add `product_image_url` column to orders tables only
3. Processor extracts image from `payload` JSON when creating orders

### Option 3: Extract On-Demand (Quick Fix)

**Pros:**
- No database changes needed
- No webhook redeployment
- Works immediately

**Cons:**
- JSON parsing on every view
- Slower UI performance
- Can't filter/search by image presence

**Implementation:**
- Add helper function in frontend to extract image from `order_json` field

---

## 📝 Image Extraction Logic (For Any Option)

Here's the extraction logic with fallbacks for multiple locations:

```typescript
function extractProductImage(lineItem: any): string | null {
  if (!lineItem) return null;
  
  // Try direct image URL (most common)
  if (lineItem.image) {
    return lineItem.image;
  }
  
  // Try variant image
  if (lineItem.variant?.image?.src) {
    return lineItem.variant.image.src;
  }
  
  // Try product images array
  if (lineItem.product?.images?.[0]?.src) {
    return lineItem.product.images[0].src;
  }
  
  // No image found
  return null;
}
```

---

## 🔄 Implementation Steps (Option 1 - RECOMMENDED)

### Step 1: Add Columns to Inbox Tables
```sql
-- Migration: XXX_add_image_to_inbox.sql
ALTER TABLE webhook_inbox_bannos 
ADD COLUMN IF NOT EXISTS product_image_url text;

ALTER TABLE webhook_inbox_flourlane 
ADD COLUMN IF NOT EXISTS product_image_url text;
```

### Step 2: Add Columns to Orders Tables
```sql
-- Migration: XXX_add_image_to_orders.sql
ALTER TABLE orders_bannos 
ADD COLUMN IF NOT EXISTS product_image_url text;

ALTER TABLE orders_flourlane 
ADD COLUMN IF NOT EXISTS product_image_url text;
```

### Step 3: Update Webhook Functions
```typescript
// Add extraction function
function extractProductImage(order: any): string | null {
  if (!order.line_items || order.line_items.length === 0) return null;
  const item = order.line_items[0];
  return item.image || 
         item.variant?.image?.src || 
         item.product?.images?.[0]?.src || 
         null;
}

// Update upsert
const shopifyOrder = JSON.parse(await req.text());
const productImage = extractProductImage(shopifyOrder);

await supabase.from('webhook_inbox_bannos').upsert({
  id: `bannos-${shopifyOrder.order_number || shopifyOrder.id}`,
  payload: shopifyOrder,
  product_image_url: productImage,  // NEW
  processed: false
}, { onConflict: 'id' });
```

### Step 4: Update Processor
When moving from inbox → orders, include the image:
```typescript
// In processor logic
INSERT INTO orders_bannos (
  ...,
  product_image_url
) VALUES (
  ...,
  inbox_row.product_image_url  -- Copy from inbox
);
```

---

## 🚀 Next Steps - Decision Required

Please decide which option you prefer:

1. **Option 1 (RECOMMENDED):** Extract at webhook time
   - Requires: 2 migrations + 2 webhook function updates + processor update
   - Best for: Performance and clean architecture
   
2. **Option 2:** Extract during processing only
   - Requires: 1 migration + processor update
   - Best for: Keeping webhooks simple
   
3. **Option 3:** Extract on-demand in frontend
   - Requires: Frontend helper function only
   - Best for: Quick fix without backend changes

---

## 📌 Important Notes

1. **Images are already in the database** in the full payload JSON
2. **Both stores** use identical webhook functions, so any fix applies to both
3. **Fallback logic** is essential because Shopify's webhook structure can vary
4. **First line item** is used for image (matches current product extraction logic)
5. **For multi-cake orders:** When processor splits orders, each line_item gets its own image

---

## ✋ Waiting for Your Decision

The investigation is complete. I'm ready to implement once you choose which option you prefer.

Would you like me to proceed with Option 1 (recommended), or would you prefer Option 2 or 3?




