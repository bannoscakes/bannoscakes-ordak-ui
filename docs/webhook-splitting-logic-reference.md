# Webhook Splitting Logic Reference

This document preserves the business logic for order categorization and splitting that was implemented in the webhook handlers. This logic will be moved to a backend processor that uses Liquid templates.

## Overview

The webhook handlers previously performed:
1. Item categorization (cakes vs accessories)
2. Multi-cake order splitting (A, B, C suffixes)
3. Accessories handling (first order only)
4. Amount division (total ÷ number of cakes)

This logic is preserved here for future backend implementation.

---

## Item Categorization Functions

### isCakeItem Function

Determines if a line item is a cake product.

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

**Rules:**
- If title contains "cake" → it's a cake
- UNLESS it also contains "topper" or "decoration" → then it's an accessory
- Accessories are checked first to prevent misclassification

### isAccessoryItem Function

Determines if a line item is an accessory.

```typescript
function isAccessoryItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  return title.includes('candle') || 
         title.includes('balloon') || 
         title.includes('topper')
}
```

**Rules:**
- Candles → accessory
- Balloons → accessory
- Toppers → accessory

---

## Order Splitting Algorithm

### Single Cake Order

If order contains 1 cake:
- Create single order record
- Include all accessories
- Use full order amount

**Example:**
- Order #20000 with 1 cake + 2 candles
- Result: `B20000` (includes candles)

### Multi-Cake Order

If order contains multiple cakes:
- Split into separate order records
- Each cake gets its own record
- Accessories go to FIRST order only
- Amount divided equally among cakes

**Suffix Generation:**
- Cakes 1-10: Use letters A, B, C, D, E, F, G, H, I, J
- Cakes 11+: Use numbers 11, 12, 13, 14...

```typescript
const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const suffix = suffixes[i] || (i + 1).toString()
```

**Example:**
- Order #20000 with 3 cakes + 2 candles
- Result:
  - `B20000-A` (Cake 1 + 2 candles, amount: total ÷ 3)
  - `B20000-B` (Cake 2, amount: total ÷ 3)
  - `B20000-C` (Cake 3, amount: total ÷ 3)

**Example with 12 cakes:**
- Order #20000 with 12 cakes
- Result: `B20000-A` through `B20000-J`, then `B20000-11`, `B20000-12`

---

## Accessories Handling

### Rules

1. **First Order Only:** All accessories go to the first split order (suffix -A)
2. **Subsequent Orders:** No accessories
3. **Accessory-Only Orders:** Skip (no production items)

### Accessories Array Structure

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

### Assignment Logic

```typescript
for (let i = 0; i < cakeItems.length; i++) {
  const isFirstOrder = i === 0
  
  const order = {
    // ... other fields ...
    accessories: isFirstOrder ? accessoriesForDB : [],
  }
}
```

---

## Amount Division

### Single Cake

Full order amount goes to the single order.

```typescript
total_amount: Number(shopifyOrder.total_price || 0)
```

### Multiple Cakes

Total amount divided equally among all cakes.

```typescript
const totalAmount = Number(shopifyOrder.total_price || 0)
const amountPerCake = totalAmount / cakeItems.length

// Each split order gets:
total_amount: amountPerCake
```

**Example:**
- Order total: $150
- 3 cakes
- Each order gets: $50

---

## Complete Splitting Example

**Shopify Order #20000:**
- Line items:
  - Chocolate Cake (qty: 2)
  - Vanilla Cake (qty: 1)
  - Birthday Candles (qty: 1)
  - Balloons (qty: 2)
- Total: $180

**Processing:**

1. **Categorize:**
   - Cakes: Chocolate Cake (qty 2), Vanilla Cake (qty 1) = 3 cakes total
   - Accessories: Birthday Candles, Balloons

2. **Split:**
   - `B20000-A`: Chocolate Cake #1 + Candles + Balloons ($60)
   - `B20000-B`: Chocolate Cake #2 ($60)
   - `B20000-C`: Vanilla Cake ($60)

3. **Database Records:**
   ```typescript
   {
     id: 'bannos-20000-A',
     order_number: 'B20000-A',
     product_title: 'Chocolate Cake',
     quantity: 1,
     total_amount: 60,
     accessories: [
       { title: 'Birthday Candles', quantity: 1, ... },
       { title: 'Balloons', quantity: 2, ... }
     ]
   }
   // ... B and C records ...
   ```

---

## Backend Implementation Notes

When implementing this logic in the backend processor:

1. **Read from inbox table:**
   ```sql
   SELECT * FROM webhook_inbox_bannos WHERE processed = false
   ```

2. **Extract data using Liquid templates:**
   - Use existing Kitchen docket templates
   - Extract product titles, quantities, customer info, etc.

3. **Apply categorization:**
   - Use `isCakeItem()` and `isAccessoryItem()` functions
   - Count total cakes

4. **Apply splitting:**
   - If 1 cake: single order
   - If multiple: split with suffixes

5. **Create final orders:**
   - Insert into `orders_bannos` or `orders_flourlane`
   - Mark inbox record as `processed = true`

---

## Reference Files

The complete implementation is preserved in:
- `supabase/functions/shopify-webhooks-bannos/index.BACKUP-with-splitting.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.BACKUP-with-splitting.ts`

These files contain the full working code with all edge cases handled.

