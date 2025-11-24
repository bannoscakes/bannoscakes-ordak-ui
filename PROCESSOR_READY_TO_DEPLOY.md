# ✅ INBOX PROCESSOR - IMPLEMENTATION COMPLETE

**Branch:** `feature/inbox-processor`  
**Status:** Ready for Review & Deployment  
**Date:** November 24, 2025

---

## 🎯 What Was Built

Created a new Supabase Edge Function (`process-inbox`) that:
- ✅ Processes webhooks from `webhook_inbox_bannos` and `webhook_inbox_flourlane`
- ✅ Fetches product images from Shopify Admin GraphQL API
- ✅ Applies order splitting logic (multi-cake orders)
- ✅ Extracts data using Liquid template logic (replicated in TypeScript)
- ✅ Populates `orders_bannos` and `orders_flourlane` with complete order data including images
- ✅ Marks webhooks as processed to prevent duplicates

---

## 📝 Key Changes from Original Code

### 1. Fixed Table Names
| Original (Wrong) | Fixed (Correct) |
|-----------------|----------------|
| `webhooks_inbox` | `webhook_inbox_bannos` / `webhook_inbox_flourlane` |
| `orders_table_bannos` | `orders_bannos` |
| `orders_table_flourlane` | `orders_flourlane` |

### 2. Removed `shop_domain` Logic
- Tables are already separated by store
- Store is now passed as a parameter to the function

### 3. Added Edge Function Wrapper
- Accepts JSON request: `{ "store": "bannos", "limit": 50 }`
- Returns processing summary with success/fail counts

### 4. Image Fetching Strategy
- **Does NOT rely on webhook payload** (images not included by Shopify)
- **Fetches from Shopify Admin API** for each product
- Uses correct admin tokens per store (`SHOPIFY_ADMIN_TOKEN` / `SHOPIFY_ADMIN_TOKEN_FLOURLANE`)

---

## 🚀 Deployment Steps

### Step 1: Deploy the Edge Function
```bash
cd /Users/panospanayi/Documents/bannoscakes-ordak-ui
npx supabase functions deploy process-inbox
```

### Step 2: Set Environment Variables in Supabase Dashboard
Go to: **Project Settings → Edge Functions → Secrets**

Add these secrets:
- `SHOPIFY_ADMIN_TOKEN` - Bannos store admin token
- `SHOPIFY_ADMIN_TOKEN_FLOURLANE` - Flourlane store admin token

(These should already exist from webhook functions, but verify they're accessible to `process-inbox`)

### Step 3: Get Function URL & Anon Key
```bash
# Get project URL
npx supabase status

# Get anon key from dashboard:
# Settings → API → Project API keys → anon public
```

### Step 4: Test with Sample Orders

**Test Bannos (5 orders):**
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"store": "bannos", "limit": 5}'
```

**Test Flourlane (5 orders):**
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"store": "flourlane", "limit": 5}'
```

### Step 5: Verify Results

**Check orders created:**
```sql
SELECT id, shopify_order_number, customer_name, product_title, product_image 
FROM orders_bannos 
ORDER BY id DESC 
LIMIT 5;

SELECT id, shopify_order_number, customer_name, product_title, product_image 
FROM orders_flourlane 
ORDER BY id DESC 
LIMIT 5;
```

**Check inbox processed:**
```sql
SELECT id, processed 
FROM webhook_inbox_bannos 
WHERE processed = true 
ORDER BY id DESC 
LIMIT 5;

SELECT id, processed 
FROM webhook_inbox_flourlane 
WHERE processed = true 
ORDER BY id DESC 
LIMIT 5;
```

### Step 6: Process All Remaining Orders

Once verified working, process all:

**Bannos (~565 orders):**
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"store": "bannos", "limit": 1000}'
```

**Flourlane (~799 orders):**
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"store": "flourlane", "limit": 1000}'
```

---

## 📊 Expected Response Format

```json
{
  "success": true,
  "store": "Bannos",
  "totalProcessed": 5,
  "successCount": 5,
  "failCount": 0,
  "results": [
    {
      "webhookId": "bannos-1234",
      "orderNumber": 1234,
      "success": true,
      "ordersCreated": 1,
      "orderIds": ["bannos-1234"]
    },
    {
      "webhookId": "bannos-1235",
      "orderNumber": 1235,
      "success": true,
      "ordersCreated": 2,
      "orderIds": ["bannos-1235-A", "bannos-1235-B"]
    }
  ]
}
```

---

## 🔧 How Order Splitting Works

### Single Cake Order
**Input:** 1 cake item + 2 accessories
**Output:** 1 order with accessories attached

Example: `bannos-1234`

### Multi-Cake Order
**Input:** 3 cake items + 1 accessory
**Output:** 3 orders with suffixes (A, B, C)
- `bannos-1235-A` ← accessories attached here
- `bannos-1235-B`
- `bannos-1235-C`

---

## 🎨 Image Fetching Details

For each cake item:
1. Extract `product_id` from line item
2. Call Shopify Admin GraphQL API:
   ```graphql
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
   ```
3. Store image URL in `product_image` column

**Handles:**
- ✅ Per-store admin tokens
- ✅ GraphQL format conversion (`gid://shopify/Product/{id}`)
- ✅ Graceful failures (returns `null` if image not found)

---

## 📁 Files Created/Modified

### New Files:
- ✅ `supabase/functions/process-inbox/index.ts` (546 lines)
- ✅ `PR_DESCRIPTION_INBOX_PROCESSOR.md`
- ✅ `PROCESSOR_IMPLEMENTATION_PLAN.md`

### Modified:
- None (clean focused PR)

---

## ✅ Pre-Deployment Checklist

- [x] Feature branch created from `dev`
- [x] Processor code implemented with fixes
- [x] Table names corrected
- [x] Image fetching via Admin API
- [x] Order splitting logic
- [x] Liquid template extraction
- [x] Edge Function wrapper
- [x] PR description created
- [x] Committed and pushed to GitHub
- [ ] Deploy Edge Function
- [ ] Set environment variables
- [ ] Test with sample orders
- [ ] Verify images in database
- [ ] Process all pending orders
- [ ] Merge PR

---

## 🔗 GitHub PR

**Branch:** `feature/inbox-processor`  
**Compare:** `dev...feature/inbox-processor`  
**URL:** https://github.com/bannoscakes/bannoscakes-ordak-ui/pull/new/feature/inbox-processor

---

## 🎯 Next Steps

1. **Review this document**
2. **Merge the PR** (or review first if needed)
3. **Deploy the function** following steps above
4. **Test with 5 orders** from each store
5. **Process all remaining orders** (1364 total)
6. **Verify images** appear in UI

---

**Ready to deploy!** 🚀

