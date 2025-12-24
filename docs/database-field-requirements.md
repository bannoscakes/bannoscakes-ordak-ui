# Database Field Requirements for Frontend

## Overview
This document details the exact fields the frontend expects from `orders_table_bannos` and `orders_table_flourlane`, their data types, nullability, and usage patterns.

---

## Core Fields Frontend Expects

### 1. **Required Fields** (Frontend MUST have these)

| Field | Type | Source | Usage | Notes |
|-------|------|--------|-------|-------|
| `id` | `number` or `string` | Database primary key | Unique identifier for all operations | Used for lookups, mutations, and as fallback for `orderNumber` |
| `store` | `'bannos' \| 'flourlane'` | Table name or column | Store identification | Critical for routing and display logic |

### 2. **Highly Important Fields** (Frontend handles nulls but degrades UX)

| Field | Type | Nullable? | Default/Fallback | Usage |
|-------|------|-----------|------------------|-------|
| `shopify_order_number` | `string` or `number` | ✅ Yes | `''` (empty string) | **Critical for "View in Shopify" links**. Frontend converts to string. Without this, Shopify admin links fail. |
| `human_id` | `string` | ✅ Yes | Falls back to `shopify_order_number` or `id` | Display-friendly order number shown in UI (e.g., "store-12345") |
| `customer_name` | `string` | ✅ Yes | `'Unknown Customer'` | Displayed in all order cards, tables, and detail views |
| `product_title` | `string` | ✅ Yes | `'Unknown Product'` | Displayed in all order cards, determines sizing logic |
| `due_date` | `string` (ISO 8601) | ✅ Yes | `new Date().toISOString()` | **Critical for sorting and priority calculation**. Expected format: `YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DD` |
| `stage` | `string` | ✅ Yes | `'Filling'` | Determines which production queue the order appears in. Values: `'Filling'`, `'Covering'`, `'Decorating'`, `'Packing'`, `'Complete'` |

### 3. **Standard Fields** (Used in most views)

| Field | Type | Nullable? | Default/Fallback | Usage |
|-------|------|-----------|------------------|-------|
| `item_qty` | `number` | ✅ Yes | `1` | Quantity displayed in order cards |
| `flavour` | `string` | ✅ Yes | `'Unknown'` or `''` | Displayed in detail views, used for production instructions |
| `size` | `string` | ✅ Yes | `'M'` | Product size. Frontend converts legacy sizes (S/M/L) to realistic names based on product type |
| `delivery_method` | `string` | ✅ Yes | `'Pickup'` | Expected values: `'delivery'` or `'pickup'` (lowercase). Frontend converts to `'Delivery'` \| `'Pickup'` |
| `priority` | `number` or `string` | ✅ Yes | Calculated from `due_date` | Frontend expects `0` (Medium), `1` (High), `2` (Low) OR `'high'`/`'medium'`/`'low'` strings |
| `assignee_id` | `string` | ✅ Yes | `null` | Staff member UUID. Null = unassigned. Used to filter assigned vs unassigned orders |
| `storage` | `string` | ✅ Yes | `'Default'` | Storage location (e.g., "Store Fridge", "Kitchen Coolroom") |

### 4. **Optional Fields** (Nice to have, currently not critical)

| Field | Type | Nullable? | Default/Fallback | Usage |
|-------|------|-----------|------------------|-------|
| `notes` | `string` | ✅ Yes | `''` | Special instructions or notes. Currently mocked in detail views |
| `order_json` | `JSONB` or `JSON` | ✅ Yes | `null` | Full Shopify webhook payload. **Currently NOT used by frontend** |
| `accessories` | `JSON` array or `string` | ✅ Yes | `[]` | List of accessories (e.g., cake toppers). **Currently mocked in detail views** |
| `created_at` | `string` (ISO 8601) | ✅ Yes | N/A | Order creation timestamp |
| `updated_at` | `string` (ISO 8601) | ✅ Yes | N/A | Last update timestamp |
| `currency` | `string` | ✅ Yes | N/A | Currency code (e.g., "AUD") |
| `total_amount` | `number` | ✅ Yes | N/A | Order total amount |

---

## Data Type Details

### `human_id`
- **Expected Type**: `string`
- **Example Values**: `"bannos-12345"`, `"store-001"`, `"ORD-2024-001"`
- **Frontend Logic**:
  ```typescript
  orderNumber: String(order.human_id || order.shopify_order_number || order.id)
  ```
- **Why Important**: Primary display identifier in UI. Users see this, not the database ID.

### `shopify_order_number`
- **Expected Type**: `string` or `number` (frontend converts to `string`)
- **Example Values**: `"5784123456789"`, `5784123456789`
- **Frontend Logic**:
  ```typescript
  shopifyOrderNumber: String(order.shopify_order_number || '')
  ```
- **Why Critical**: Used to construct Shopify admin links:
  ```typescript
  window.open(`https://admin.shopify.com/orders/${encodeURIComponent(shopifyOrderNumber)}`, '_blank')
  ```
- **Consequence if Missing**: "View in Shopify" buttons show error toast, links don't work.

### `customer_name`
- **Expected Type**: `string`
- **Example Values**: `"John Smith"`, `"Jane Doe"`
- **Frontend Logic**:
  ```typescript
  customerName: order.customer_name || "Unknown Customer"
  ```
- **Searchable**: Yes, used in search filters across all workspace pages.

### `product_title`
- **Expected Type**: `string`
- **Example Values**: `"Chocolate Cupcakes"`, `"Custom Wedding Cake"`, `"Birthday Cake"`
- **Frontend Logic**:
  ```typescript
  product: order.product_title || "Unknown Product"
  ```
- **Why Important**: Determines size conversion logic (cupcakes vs cakes vs wedding cakes have different size meanings).
- **Searchable**: Yes, used in search filters.

### `flavour` (British spelling!)
- **Expected Type**: `string`
- **Example Values**: `"Chocolate"`, `"Vanilla"`, `"Red Velvet"`
- **Frontend Logic**:
  ```typescript
  flavor: order.flavour || "Unknown"
  ```
- **Note**: Database uses British spelling `flavour`, frontend converts to American `flavor` for UI state.

### `size`
- **Expected Type**: `string`
- **Example Values**: `"S"`, `"M"`, `"L"`, `"6-inch Round"`, `"Standard"`
- **Frontend Logic**: Converts legacy S/M/L sizes to realistic names based on product:
  ```typescript
  // Cupcakes: "Mini" | "Standard" | "Jumbo"
  // Wedding Cakes: "6-inch Round" | "8-inch Round" | "10-inch Round"
  // Birthday Cakes: "Small" | "Medium Tall" | "8-inch Round"
  ```
- **Fallback**: `"M"`

### `notes`
- **Expected Type**: `string`
- **Example Values**: `"Please write 'Happy Birthday Sarah'"`, `"Customer allergic to nuts"`
- **Frontend Logic**:
  ```typescript
  notes: order.notes || ""
  ```
- **Current Status**: **Mostly mocked in detail views**. EditOrderDrawer can save notes, but they may not be displayed correctly yet.

### `delivery_method`
- **Expected Type**: `string` (lowercase in database)
- **Expected Values**: `"delivery"` or `"pickup"`
- **Frontend Logic**:
  ```typescript
  method: order.delivery_method === "delivery" ? "Delivery" : "Pickup"
  ```
- **Display Values**: `"Delivery"` | `"Pickup"` (capitalized)

### `due_date`
- **Expected Type**: `string` (ISO 8601 datetime or date)
- **Preferred Format**: `YYYY-MM-DDTHH:mm:ss.sssZ` (full ISO 8601)
- **Acceptable Format**: `YYYY-MM-DD` (date only)
- **Example Values**: 
  - `"2025-11-20T10:00:00.000Z"` ✅ Preferred
  - `"2025-11-20"` ✅ Acceptable
- **Frontend Logic**:
  ```typescript
  deliveryTime: order.due_date || new Date().toISOString()
  dueTime: order.due_date || new Date().toISOString()
  ```
- **Why Important**: 
  - Used for sorting orders
  - Used to calculate priority (orders due today/tomorrow = High priority)
  - Displayed in order cards and detail views

### `stage`
- **Expected Type**: `string`
- **Allowed Values**: `'Filling'` | `'Covering'` | `'Decorating'` | `'Packing'` | `'Complete'`
- **Case Sensitivity**: **Case-insensitive in frontend** (converted to lowercase for comparison)
- **Frontend Logic**:
  ```typescript
  const stageKey = order.stage?.toLowerCase() || 'unassigned';
  if (!order.assignee_id && stageKey === 'filling') {
    grouped.unassigned.push(item);
  } else if (stageKey === 'packing') {
    grouped.packing.push(item);
  }
  ```
- **Mapping to Status**:
  ```typescript
  status: mapStageToStatus(order.stage)
  // 'Complete' → 'Completed'
  // Others → 'In Production' or 'Pending' based on assignee_id
  ```

### `priority`
- **Database Type**: `priority_level` enum - `'High'` | `'Medium'` | `'Low'`
- **Frontend Logic**:
  ```typescript
  priority: foundOrder.priority as "High" | "Medium" | "Low"
  ```
- **Display Values**: `"High"` | `"Medium"` | `"Low"` (capitalized)
- **Auto-calculation**: Priority is calculated from `due_date` on import:
  - Due today or overdue → High
  - Due within 3 days → Medium
  - Due > 3 days away → Low
- **Note**: Orders with missing `due_date` should be flagged for manual attention. See issue #454.

### `assignee_id`
- **Expected Type**: `string` (UUID) or `null`
- **Example Values**: `"550e8400-e29b-41d4-a716-446655440000"`, `null`
- **Frontend Logic**:
  ```typescript
  status: order.assignee_id ? 'In Production' : 'Pending'
  ```
- **Why Important**: Determines if order is assigned (in production) or unassigned (waiting to be picked up)

### `storage`
- **Expected Type**: `string`
- **Example Values**: `"Store Fridge"`, `"Kitchen Coolroom"`, `"Kitchen Freezer"`, `"Basement Coolroom"`
- **Frontend Logic**:
  ```typescript
  storage: order.storage || "Default"
  ```
- **Usage**: Can be filtered by storage location in QueueTable

---

## Fields Currently NOT Used by Frontend

### `order_json`
- **Type**: `JSONB` or `JSON`
- **Purpose**: Store full Shopify webhook payload
- **Frontend Status**: **NOT USED**
- **Recommendation**: Safe to store for audit/debugging, but frontend doesn't read it

### `accessories`
- **Type**: `JSON` array or `string`
- **Example**: `["Cake Stand", "Decorative Flowers", "Cake Topper"]`
- **Frontend Status**: **Mocked in detail views**. EditOrderDrawer has UI for accessories, but they may not be saved/loaded correctly from DB yet.
- **Expected Format (if implemented)**:
  ```json
  ["accessory1", "accessory2", "accessory3"]
  ```
  OR
  ```json
  [
    {"name": "Cake Stand", "quantity": 1},
    {"name": "Candles", "quantity": 24}
  ]
  ```

---

## Missing Fields You Should Include

Based on the frontend code, here are fields you should ensure are in your processor:

### ✅ Already Covered
- ✅ `id`
- ✅ `store`
- ✅ `human_id`
- ✅ `shopify_order_number`
- ✅ `customer_name`
- ✅ `product_title`
- ✅ `flavour`
- ✅ `size`
- ✅ `notes`
- ✅ `delivery_method`
- ✅ `due_date`

### ⚠️ Potentially Missing (Check Your Processor)
- ⚠️ `item_qty` - Quantity of items
- ⚠️ `stage` - Production stage (Filling, Covering, Decorating, Packing, Complete)
- ⚠️ `priority` - Priority level (0/1/2 or 'high'/'medium'/'low')
- ⚠️ `assignee_id` - Staff member assigned to order (UUID or null)
- ⚠️ `storage` - Storage location string

### 📝 Optional But Useful
- 📝 `accessories` - JSON array of accessories
- 📝 `order_json` - Full webhook payload for debugging
- 📝 `created_at` - Timestamp
- 📝 `updated_at` - Timestamp
- 📝 `currency` - Currency code
- 📝 `total_amount` - Order total

---

## Format Specifications

### Date Format for `due_date`
**Preferred**: ISO 8601 with timezone
```
2025-11-20T10:00:00.000Z
```

**Acceptable**: Date only (frontend adds current time)
```
2025-11-20
```

**❌ Not Recommended**: Other formats may cause parsing errors
```
11/20/2025        ❌
20-Nov-2025       ❌
2025-11-20 10:00  ❌ (no timezone)
```

### Priority Format
**Option 1 (Recommended)**: Numeric
```typescript
0 = Medium
1 = High
2 = Low
```

**Option 2**: String (lowercase)
```typescript
'high'
'medium'
'low'
```

### Delivery Method Format
**Database**: Lowercase
```typescript
'delivery' | 'pickup'
```

**Frontend Display**: Capitalized
```typescript
'Delivery' | 'Pickup'
```

### Stage Format
**Database**: Any case (frontend normalizes)
```typescript
'Filling' | 'Covering' | 'Decorating' | 'Packing' | 'Complete'
// OR
'filling' | 'covering' | 'decorating' | 'packing' | 'complete'
```

**Frontend**: Converts to lowercase for comparisons, uses capitalized for display

---

## Critical Recommendations for Your Processor

### 1. **MUST HAVE**
- ✅ `shopify_order_number` - Critical for Shopify admin links
- ✅ `human_id` - Better UX than showing database IDs
- ✅ `customer_name` - Core order info
- ✅ `product_title` - Core order info
- ✅ `due_date` - Critical for sorting and priority

### 2. **SHOULD HAVE**
- ⚠️ `item_qty` - Quantity (defaults to 1 if missing)
- ⚠️ `stage` - Defaults to 'Filling' if missing
- ⚠️ `assignee_id` - Should be `null` for new orders
- ⚠️ `priority` - Can be auto-calculated from `due_date` if missing

### 3. **NICE TO HAVE**
- 📝 `storage` - Defaults to 'Default' if missing
- 📝 `notes` - Defaults to empty string if missing
- 📝 `accessories` - Currently mocked, but will be useful
- 📝 `order_json` - Good for debugging, not used by frontend

### 4. **Data Type Safety**
Your processor should:
- Convert `shopify_order_number` to `string` (even if it's numeric in Shopify)
- Ensure `item_qty` is a `number` (default to 1)
- Ensure `due_date` is ISO 8601 format
- Ensure `delivery_method` is lowercase (`'delivery'` or `'pickup'`)
- Ensure `store` matches table name (`'bannos'` or `'flourlane'`)
- Set `assignee_id` to `null` for new orders (not empty string)
- Set `stage` to `'Filling'` for new orders
- Calculate or set `priority` based on `due_date`

---

## Example Complete Order Object

```typescript
{
  id: "12345",                                    // or number
  store: "bannos",                                // 'bannos' | 'flourlane'
  human_id: "bannos-12345",                       // string, display-friendly
  shopify_order_number: "5784123456789",          // string or number
  customer_name: "John Smith",                    // string
  product_title: "Chocolate Cupcakes (12 pack)",  // string
  flavour: "Chocolate",                           // string (British spelling)
  size: "M",                                      // string (S/M/L or realistic)
  item_qty: 12,                                   // number
  due_date: "2025-11-20T10:00:00.000Z",          // ISO 8601 string
  delivery_method: "delivery",                    // 'delivery' | 'pickup'
  stage: "Filling",                               // production stage
  priority: 1,                                    // 0/1/2 or 'high'/'medium'/'low'
  assignee_id: null,                              // UUID string or null
  storage: "Store Fridge",                        // string or null
  notes: "Please add birthday candles",           // string or null
  accessories: ["Cupcake Liners", "Candles"],    // JSON array or null
  order_json: { /* full webhook */ },             // JSONB or null
  created_at: "2025-11-15T08:30:00.000Z",        // ISO 8601 string
  updated_at: "2025-11-15T08:30:00.000Z"         // ISO 8601 string
}
```

---

## Summary

**Absolutely Required**:
- `id`, `store`, `shopify_order_number`, `human_id`, `customer_name`, `product_title`, `due_date`

**Highly Recommended**:
- `item_qty`, `stage`, `assignee_id`, `delivery_method`, `flavour`, `size`, `priority`

**Optional but Useful**:
- `storage`, `notes`, `accessories`, `order_json`, timestamps

**Critical Data Types**:
- `due_date`: ISO 8601 string (with or without time)
- `shopify_order_number`: string (for Shopify admin links)
- `priority`: number (0/1/2) or lowercase string
- `delivery_method`: lowercase string ('delivery'/'pickup')
- `assignee_id`: UUID string or null (not empty string)




