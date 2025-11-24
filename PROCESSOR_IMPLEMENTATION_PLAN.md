# 🎯 PROCESSOR IMPLEMENTATION PLAN

**Date:** November 24, 2025  
**Status:** Ready to Implement with Fixes

---

## 📋 Changes Needed

### 1. Fix Table Names

**Current (Wrong):**
```typescript
from('webhooks_inbox')           // Single table - doesn't exist
from('orders_table_bannos')      // Wrong name
from('orders_table_flourlane')   // Wrong name
```

**Correct:**
```typescript
from('webhook_inbox_bannos')     // Separate per store
from('webhook_inbox_flourlane')  // Separate per store  
from('orders_bannos')            // Correct name
from('orders_flourlane')         // Correct name
```

### 2. Remove `shop_domain` Logic

**Why:** Tables are already separated by store, no need to check domain

**Change:**
- Remove line 419: `const shopDomain = webhook.shop_domain || ''`
- Determine store from the table being queried instead

### 3. Create Two Processing Functions

Since tables are separated by store, create:
- `processBannosInbox()` - processes `webhook_inbox_bannos`
- `processFlourlaneInbox()` - processes `webhook_inbox_flourlane`

### 4. Add Edge Function Wrapper

Wrap in Deno `serve()` to make it a deployable Edge Function

---

## 🏗️ Implementation Structure

### File: `supabase/functions/process-inbox/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Parse request body
  const { store, limit } = await req.json()
  
  // Process appropriate store
  if (store === 'bannos') {
    return await processBannosInbox(limit)
  } else if (store === 'flourlane') {
    return await processFlourlaneInbox(limit)
  }
  
  // ... rest of processor code
})
```

---

## 🔧 Specific Changes

### Change 1: Line 408 - Read from store-specific inbox

**Before:**
```typescript
const { data: webhook, error: fetchError } = await supabase
  .from('webhooks_inbox')
  .select('*')
  .eq('id', webhookId)
  .single()
```

**After:**
```typescript
// storeSource passed as parameter
const inboxTable = storeSource === 'Flourlane' 
  ? 'webhook_inbox_flourlane'
  : 'webhook_inbox_bannos'

const { data: webhook, error: fetchError } = await supabase
  .from(inboxTable)
  .select('*')
  .eq('id', webhookId)
  .single()
```

### Change 2: Line 419-422 - Remove shop_domain logic

**Before:**
```typescript
const shopifyOrder = webhook.payload
const shopDomain = webhook.shop_domain || ''

// Determine store source
const storeSource = shopDomain.includes('flour-lane') ? 'Flourlane' : 'Bannos'
```

**After:**
```typescript
const shopifyOrder = webhook.payload
// storeSource already passed as parameter, no need to determine
```

### Change 3: Lines 451-453 - Fix table names

**Before:**
```typescript
const orderTable = storeSource === 'Flourlane' 
  ? 'orders_table_flourlane'
  : 'orders_table_bannos'
```

**After:**
```typescript
const orderTable = storeSource === 'Flourlane' 
  ? 'orders_flourlane'
  : 'orders_bannos'
```

### Change 4: Line 492-496 - Process per-store inbox

**Before:**
```typescript
const { data: webhooks, error: fetchError } = await supabase
  .from('webhooks_inbox')  // Wrong table
  .select('*')
  .eq('processed', false)
  .order('created_at', { ascending: true })
```

**After:**
```typescript
// Need to specify which store to process
const inboxTable = storeSource === 'Flourlane' 
  ? 'webhook_inbox_flourlane'
  : 'webhook_inbox_bannos'

const { data: webhooks, error: fetchError } = await supabase
  .from(inboxTable)
  .select('*')
  .eq('processed', false)
  .limit(50)  // Add limit for safety
```

---

## 🎯 Final Structure

### Main Processing Functions:

1. **`processBannosInbox(limit)`**
   - Reads from `webhook_inbox_bannos`
   - Processes up to `limit` orders
   - Writes to `orders_bannos`
   - Marks as processed in `webhook_inbox_bannos`

2. **`processFlourlaneInbox(limit)`**
   - Reads from `webhook_inbox_flourlane`
   - Processes up to `limit` orders
   - Writes to `orders_flourlane`
   - Marks as processed in `webhook_inbox_flourlane`

3. **Edge Function Handler**
   - Accepts: `{ store: 'bannos' | 'flourlane', limit: number }`
   - Routes to appropriate processor
   - Returns: Summary of processed orders

---

## ✅ What Stays the Same

- ✅ Image fetching logic (already perfect!)
- ✅ Order splitting logic
- ✅ Property extraction
- ✅ Date/delivery parsing
- ✅ Cake/accessory categorization
- ✅ All Liquid template logic

---

## 🚀 Deployment Steps

1. **Create Edge Function directory**
   ```bash
   mkdir -p supabase/functions/process-inbox
   ```

2. **Copy processor code with fixes**
   - Fix table names
   - Remove shop_domain logic
   - Add Edge Function wrapper
   - Add store parameter

3. **Deploy to Supabase**
   ```bash
   npx supabase functions deploy process-inbox
   ```

4. **Test with sample order**
   - Call function with `{ store: 'bannos', limit: 1 }`
   - Verify order appears in `orders_bannos`
   - Check that image is populated

5. **Process all pending orders**
   - Call for Bannos: 565 orders
   - Call for Flourlane: 799 orders

---

## 📊 Expected Results

After processing:
- `orders_bannos`: ~565+ orders with images
- `orders_flourlane`: ~799+ orders with images
- `webhook_inbox_bannos`: All marked as `processed = true`
- `webhook_inbox_flourlane`: All marked as `processed = true`

---

**Ready to implement? Just say "go ahead" and I'll make all the fixes!**

