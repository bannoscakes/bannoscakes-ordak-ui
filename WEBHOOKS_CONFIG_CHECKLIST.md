# Shopify Webhooks Configuration Checklist

**Date:** 2025-11-03  
**Status:** Metafield-driven implementation  
**Purpose:** Verify all settings are correct for metafield-based webhook processing

**Note:** HMAC verification has been removed. No secrets needed for webhook authentication.

---

## 1. Supabase Edge Functions - Environment Secrets

**Location:** Supabase Dashboard → Edge Functions → Settings

- [ ] `SUPABASE_URL` is set to: `https://iwavciibrspfjezujydc.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for RPC calls)
- [ ] `SUPABASE_ANON_KEY` is set

**Notes:**
- Click "Reveal" to verify each secret is not empty
- Secrets are masked by default
- No webhook authentication secrets needed

---

## 2. Supabase Database Tables

**Location:** Supabase Dashboard → Table Editor

### Table: `orders_bannos`
- [ ] Table exists
- [ ] Has column: `id` (text, PK)
- [ ] Has column: `shopify_order_id` (bigint)
- [ ] Has column: `shopify_order_gid` (text, unique)
- [ ] Has column: `shopify_order_number` (bigint)
- [ ] Has column: `customer_name` (text)
- [ ] Has column: `product_title` (text)
- [ ] Has column: `flavour` (text)
- [ ] Has column: `notes` (text)
- [ ] Has column: `due_date` (date)
- [ ] Has column: `delivery_method` (text)
- [ ] Has column: `stage` (text)
- [ ] Has column: `order_json` (jsonb)

### Table: `orders_flourlane`
- [ ] Table exists (same structure as `orders_bannos`)

### Table: `work_queue`
- [ ] Table exists
- [ ] Has column: `id` (uuid, PK)
- [ ] Has column: `created_at` (timestamptz)
- [ ] Has column: `topic` (text)
- [ ] Has column: `payload` (jsonb)
- [ ] Has column: `status` (text)
- [ ] Has index on: `(status, topic, created_at DESC)`

### Table: `dead_letter`
- [ ] Table exists
- [ ] Has column: `id` (uuid or bigint, PK)
- [ ] Has column: `created_at` (timestamptz)
- [ ] Has column: `payload` (jsonb)
- [ ] Has column: `reason` (text)

**Check for existing data:**
- [ ] Checked `orders_bannos` - Found _____ rows
- [ ] Checked `orders_flourlane` - Found _____ rows
- [ ] Checked `work_queue` - Found _____ rows
- [ ] Checked `dead_letter` - Found _____ rows

---

## 3. Supabase RPC Functions

**Location:** Supabase Dashboard → SQL Editor

Run this query to verify:
```sql
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('deduct_on_order_create', 'enqueue_order_split');
```

- [ ] Function `deduct_on_order_create` exists
- [ ] Function `enqueue_order_split` exists
- [ ] Both functions have security type: `DEFINER` (SECURITY DEFINER)

---

## 4. Supabase Edge Function Deployment

**Location:** Supabase Dashboard → Edge Functions

### Function: `shopify-webhooks-bannos`
- [ ] Function is listed
- [ ] Status: Active/Deployed (green indicator)
- [ ] Recent logs (last 1 hour) show 200 responses
- [ ] No 503 boot errors in logs
- [ ] No 500 internal errors in logs

### Function: `shopify-webhooks-flourlane`
- [ ] Function is listed
- [ ] Status: Active/Deployed (green indicator)
- [ ] Recent logs (last 1 hour) show 200 responses
- [ ] No 503 boot errors in logs
- [ ] No 500 internal errors in logs

---

## 5. Shopify Webhooks - Bannos Store

**Location:** Bannos Shopify Admin → Settings → Notifications → Webhooks

### Webhook: Order Creation
- [ ] Event: `orders/create` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-bannos`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Bannos Store Requirements
- [ ] Shopify Flow is configured to create `ordak.kitchen_json` metafield
- [ ] Metafield namespace: `ordak`
- [ ] Metafield key: `kitchen_json`
- [ ] Flow runs on order creation

---

## 6. Shopify Webhooks - Flourlane Store

**Location:** Flourlane Shopify Admin → Settings → Notifications → Webhooks

### Webhook: Order Creation
- [ ] Event: `orders/create` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-flourlane`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Flourlane Store Requirements
- [ ] Shopify Flow is configured to create `ordak.kitchen_json` metafield
- [ ] Metafield namespace: `ordak`
- [ ] Metafield key: `kitchen_json`
- [ ] Flow runs on order creation

---

## 7. Manual Endpoint Tests

**Run these commands in terminal to verify endpoints:**

### Test 1: Bannos GET Request (Health Check)
```bash
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-bannos
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] No errors in response

### Test 2: Flourlane GET Request (Health Check)
```bash
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-flourlane
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] No errors in response

---

## 8. Configuration Files Verification

**Location:** Local repository

### File: `supabase/functions/shopify-webhooks-bannos/deno.json`
- [ ] File exists
- [ ] Contains import map: `"std/": "https://deno.land/std@0.224.0/"`

### File: `supabase/functions/shopify-webhooks-bannos/index.ts`
- [ ] File exists
- [ ] File is valid TypeScript
- [ ] No syntax errors
- [ ] Reads `ordak.kitchen_json` metafield
- [ ] Includes idempotency check

### File: `supabase/functions/shopify-webhooks-flourlane/deno.json`
- [ ] File exists
- [ ] Contains import map: `"std/": "https://deno.land/std@0.224.0/"`

### File: `supabase/functions/shopify-webhooks-flourlane/index.ts`
- [ ] File exists
- [ ] File is valid TypeScript
- [ ] No syntax errors
- [ ] Reads `ordak.kitchen_json` metafield
- [ ] Includes idempotency check

### File: `supabase/config.toml`
- [ ] File exists
- [ ] Contains `[functions.shopify-webhooks-bannos]` with `verify_jwt = false`
- [ ] Contains `[functions.shopify-webhooks-flourlane]` with `verify_jwt = false`

---

## 9. Review Recent Webhook Activity

**Check Supabase Edge Function Logs**

**Location:** Supabase Dashboard → Edge Functions → Logs (Last 1 hour)

### Bannos Function
- [ ] Total requests in last hour: _____
- [ ] Successful (200): _____
- [ ] Server errors (5xx): _____
- [ ] No boot errors (503) visible
- [ ] All POST requests from Shopify returned 200

### Flourlane Function
- [ ] Total requests in last hour: _____
- [ ] Successful (200): _____
- [ ] Server errors (5xx): _____
- [ ] No boot errors (503) visible
- [ ] All POST requests from Shopify returned 200

**Check Shopify Webhook Delivery Status**

**Bannos:**
- [ ] Last successful delivery: __________ (timestamp)
- [ ] Consecutive failures: 0
- [ ] No "Webhook failed" warnings

**Flourlane:**
- [ ] Last successful delivery: __________ (timestamp)
- [ ] Consecutive failures: 0
- [ ] No "Webhook failed" warnings

---

## Summary & Sign-off

### Issues Found (if any):
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Ready to Proceed?
- [ ] All critical items checked and verified
- [ ] No configuration issues found
- [ ] Database tables and RPC functions exist
- [ ] Both Edge functions are healthy (no boot errors)
- [ ] Manual tests all passed
- [ ] Shopify Flow creates metafield correctly
- [ ] Ready for production use

**Completed by:** _________________  
**Date/Time:** _________________  
**Notes:** 

---

## Next Steps

Once all items are checked:

1. **If all green:** System is ready for production orders
2. **If issues found:** Fix configuration issues first, then re-verify
3. **Test plan:** Create test order in Shopify → verify Flow creates metafield → verify webhook processes order → confirm database insert

---

**File updated:** 2025-11-03  
**Implementation:** Metafield-driven webhooks  
**Reference:** `feat/webhook-metafield-refactor` branch
