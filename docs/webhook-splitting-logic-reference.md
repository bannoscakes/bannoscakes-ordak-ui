# Webhook Splitting Logic Reference

**Purpose:** This document preserves the order splitting and categorization logic that was previously implemented in the webhook handlers. This logic will be migrated to a backend processor that uses Liquid templates to extract data from raw Shopify orders.

**Date:** 2025-11-05  
**Status:** Preserved for future backend implementation

---

## Overview

The webhook handlers previously performed inline order splitting and item categorization. This logic has been moved to backup files and will be reimplemented in a backend processor using Liquid templates for data extraction.

---

## Item Categorization Functions

### isCakeItem Function

Determines if a line item is a cake (production item).

```typescript
function isCakeItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  
  // Accessories are NOT cakes
  if (isAccessoryItem(item)) return false
  
  // Contains "cake" → is a cake
  if (title.includes('cake')) {
    // Exclude cake accessories
    if (title.includes('topper') || title.includes('decoration')) return false
    return true
  }
  
  return false
}
```

**Logic:**
1. Check if item is an accessory first (accessories are never cakes)
2. If title contains "cake", it's a cake
3. Exception: Items with "topper" or "decoration" are NOT cakes (even if title contains "cake")
4. Default: false (not a cake)

### isAccessoryItem Function

Determines if a line item is an accessory (non-production item).

```typescript
function isAccessoryItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  return title.includes('candle') || 
         title.includes('balloon') || 
         title.includes('topper')
}
```

**Logic:**
- Check if title contains: "candle", "balloon", or "topper"
- These are accessories, not production items

---

## Order Splitting Algorithm

### Single Cake Orders

When order contains 0 or 1 cake items:

```typescript
if (cakeItems.length <= 1) {
  const order = {
    id: `bannos-${shopifyOrder.order_number}`,  // or flourlane-
    order_number: `B${shopifyOrder.order_number}`,  // or F
    // ... other fields
    accessories: accessoriesForDB,  // ALL accessories included
    total_amount: Number(shopifyOrder.total_price || 0),  // FULL amount
  }
  orders.push(order)
}
```

**Result:** Single order record with all accessories and full amount.

### Multi-Cake Orders

When order contains 2+ cake items:

```typescript
const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const totalAmount = Number(shopifyOrder.total_price || 0)
const amountPerCake = totalAmount / cakeItems.length

for (let i = 0; i < cakeItems.length; i++) {
  const cakeItem = cakeItems[i]
  const suffix = suffixes[i] || (i + 1).toString()  // A-J, then 11, 12, 13...
  const isFirstOrder = i === 0
  
  const order = {
    id: `bannos-${shopifyOrder.order_number}-${suffix}`,
    order_number: `B${shopifyOrder.order_number}-${suffix}`,
    product_title: cakeItem.title,  // Individual cake title
    accessories: isFirstOrder ? accessoriesForDB : [],  // Only first order gets accessories
    total_amount: amountPerCake,  // Divided amount
  }
  orders.push(order)
}
```

**Result:** Multiple order records (A, B, C...) with:
- First order (-A): Gets ALL accessories
- Subsequent orders (-B, -C...): No accessories
- Amount divided evenly across all orders

### Suffix Generation

**For orders with 1-10 cakes:**
- Use alphabetical suffixes: A, B, C, D, E, F, G, H, I, J

**For orders with 11+ cakes:**
- Fallback to numeric suffixes: 11, 12, 13, 14...
- Logic: `suffixes[i] || (i + 1).toString()`

**Example:**
- 3 cakes: B20000-A, B20000-B, B20000-C
- 12 cakes: B20000-A through B20000-J, then B20000-11, B20000-12

---

## Accessories Handling

### Accessories Preparation

```typescript
const accessoriesForDB = accessoryItems.map(item => ({
  title: item.title,
  quantity: item.quantity,
  shopify_variant_id: item.variant_id?.toString(),
  shopify_product_id: item.product_id?.toString(),
  price: item.price,
  vendor: item.vendor
}))
```

### Distribution Rules

1. **Single cake order:** All accessories included
2. **Multi-cake order:** 
   - First order (-A): Gets ALL accessories
   - All other orders (-B, -C...): Empty accessories array
3. **Accessory-only orders:** Skipped (no production items)

**Rationale:** Matches physical kitchen docket behavior where accessories are listed on first ticket only.

---

## Amount Division

### Single Order
```typescript
total_amount: Number(shopifyOrder.total_price || 0)
```
Full order amount assigned to single order.

### Split Orders
```typescript
const totalAmount = Number(shopifyOrder.total_price || 0)
const amountPerCake = totalAmount / cakeItems.length

// Each order gets:
total_amount: amountPerCake
```

**Example:**
- Order total: $300
- 3 cakes
- Each split order: $100

**Rationale:** Prevents inflated financial reporting where split orders would otherwise show $300 each (totaling $900).

---

## Item Categorization Loop

```typescript
const lineItems = shopifyOrder.line_items || []
const cakeItems = []
const accessoryItems = []

for (const item of lineItems) {
  if (isCakeItem(item)) {
    // Expand quantity: 1 item with qty=3 becomes 3 separate entries
    for (let i = 0; i < item.quantity; i++) {
      cakeItems.push(item)
    }
  } else if (isAccessoryItem(item)) {
    accessoryItems.push(item)
  }
}
```

**Key Behavior:** Quantity expansion
- Line item with quantity=3 becomes 3 separate cake entries
- Enables 1:1 mapping of cakes to split orders

---

## Special Cases

### Accessory-Only Orders

```typescript
if (cakeItems.length === 0) {
  console.log('Skipping accessory-only order')
  return new Response('OK - No production items', { status: 200, headers: corsHeaders })
}
```

**Behavior:** Orders with only accessories (no cakes) are skipped.  
**Rationale:** No production work required.

### Tag-Based Blocking (Removed)

Previously blocked orders without tags:
```typescript
// REMOVED - Tags not available in webhook payload
const orderTags = shopifyOrder.tags || ''
if (!orderTags || orderTags.trim() === '') {
  return new Response('Order blocked - test order', { status: 200 })
}
```

**Why removed:** Tags not reliably present in webhook payload, caused legitimate orders to be blocked.

---

## Database Fields Mapping

### Fields Populated by Webhook

**Single Order:**
- `id`: `bannos-{order_number}` or `flourlane-{order_number}`
- `order_number`: `B{order_number}` or `F{order_number}`
- `product_title`: First cake title
- `accessories`: All accessories
- `total_amount`: Full order amount

**Split Orders:**
- `id`: `bannos-{order_number}-{suffix}`
- `order_number`: `B{order_number}-{suffix}`
- `product_title`: Individual cake title
- `accessories`: Only on first order (-A)
- `total_amount`: Divided amount

### Common Fields (All Orders)
- `shopify_order_id`: Numeric ID
- `shopify_order_number`: Order number
- `shopify_order_gid`: GraphQL ID
- `customer_name`: First + Last name
- `customer_email`: Email address
- `currency`: Currency code (default: AUD)
- `stage`: 'Filling' (initial stage)
- `status`: 'new-order'
- `current_stage`: 'Order received'
- `delivery_method`: 'delivery' or 'pickup'
- `fulfillment_type`: 'delivery' or 'pickup'
- `store_source`: 'Bannos' or 'flour_lane'
- `order_json`: Full Shopify payload (jsonb)
- `created_at`: Timestamp

---

## Migration to Backend Processor

### Recommended Approach

1. **Read raw orders from database**
   - Query `orders_bannos` or `orders_flourlane`
   - Read `order_json` field (full Shopify payload)

2. **Use Liquid templates for data extraction**
   - Extract delivery date, flavours, notes, etc.
   - Same templates used for Kitchen docket / Packing slip

3. **Apply categorization logic**
   - Port `isCakeItem()` and `isAccessoryItem()` functions
   - Categorize line items from `order_json`

4. **Apply splitting logic**
   - Use suffix generation algorithm
   - Create split order records
   - Distribute accessories to first order only
   - Divide amounts evenly

5. **Update database records**
   - Populate NULL fields from Liquid extraction
   - Create split order records if needed
   - Maintain reference to original order

### Benefits of Backend Processing

- Can reprocess orders if logic changes
- Liquid templates handle complex Shopify data
- Easier to debug and test
- Webhook remains simple and reliable
- Can handle orders retroactively

---

## Code Location

**Backup files (full implementation):**
- `supabase/functions/shopify-webhooks-bannos/index.BACKUP-with-splitting.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.BACKUP-with-splitting.ts`

**Current simplified webhooks:**
- `supabase/functions/shopify-webhooks-bannos/index.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.ts`

---

## Testing Considerations

When implementing backend processor:

1. **Test single cake orders**
   - Verify no splitting occurs
   - Verify all accessories included
   - Verify full amount assigned

2. **Test multi-cake orders**
   - Verify correct suffix generation (A, B, C...)
   - Verify accessories only on first order
   - Verify amount division is correct

3. **Test edge cases**
   - 10 cakes (last alphabetical suffix)
   - 11+ cakes (numeric suffix fallback)
   - Accessory-only orders (should skip)
   - Orders with cake accessories (should not be categorized as cakes)

4. **Test amount division**
   - Verify sum of split amounts equals original total
   - Handle rounding for odd divisions

---

**Document maintained by:** Development Team  
**Last updated:** 2025-11-05  
**Related:** `docs/webhook-ingest.md`, `docs/orders-splitting.md`

