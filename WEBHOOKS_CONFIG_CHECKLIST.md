# Shopify Webhooks Configuration Checklist

**Date:** 2025-11-02  
**Status:** Pre-restoration verification  
**Purpose:** Verify all settings are correct before restoring full webhook handler

---

## 1. Supabase Edge Functions - Environment Secrets

**Location:** Supabase Dashboard → Edge Functions → shopify-webhooks → Settings

- [-] `SHOPIFY_APP_SECRET_BANNOS` is set (for Bannos store HMAC validation)
- [-] `SHOPIFY_APP_SECRET_FLOURLANE` is set (for Flourlane store HMAC validation)
- [ ] `SUPABASE_URL` is set to: `https://iwavciibrspfjezujydc.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for RPC calls)
- [ ] `SUPABASE_ANON_KEY` is set
- [ ] (Optional) `SHOPIFY_APP_SECRET` is set (legacy fallback)

**Notes:**
- Click "Reveal" to verify each secret is not empty
- Secrets are masked by default

---

## 2. Supabase Database Tables

**Location:** Supabase Dashboard → Table Editor

### Table: `processed_webhooks`
- [ ] Table exists
- [ ] Has column: `id` (text, part of PK)
- [ ] Has column: `shop_domain` (text, part of PK)
- [ ] Has column: `topic` (text)
- [ ] Has column: `status` (text with CHECK: ok|rejected|error)
- [ ] Has column: `received_at` (timestamptz)
- [ ] Has column: `http_hmac` (text, nullable)
- [ ] Has column: `note` (text, nullable)
- [ ] Primary key is: `(id, shop_domain)`

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
- [ ] Checked `processed_webhooks` - Found _____ rows
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
AND routine_name = 'enqueue_order_split';
```

- [ ] Function `enqueue_order_split` exists
- [ ] Function type is: `FUNCTION`
- [ ] Security type is: `DEFINER` (SECURITY DEFINER)
- [ ] Function has parameters: `p_shop_domain`, `p_topic`, `p_hook_id`, `p_body`

---

## 4. Supabase Edge Function Deployment

**Location:** Supabase Dashboard → Edge Functions

- [ ] Function name: `shopify-webhooks` is listed
- [ ] Status: Active/Deployed (green indicator)
- [ ] Current version: 24 (or higher)
- [ ] Last deployed: Within last 24 hours
- [ ] Recent logs (last 1 hour) show 200 responses
- [ ] No 503 boot errors in logs
- [ ] No 500 internal errors in logs

---

## 5. Shopify Webhooks - Bannos Store

**Location:** Bannos Shopify Admin → Settings → Notifications → Webhooks

### Webhook 1: Order Creation
- [ ] Event: `orders/create` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Webhook 2: Order Updated
- [ ] Event: `orders/updated` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Bannos App Credentials
- [ ] App has "Orders" read permission
- [ ] Webhooks are configured in this app (not manually)
- [ ] API secret key is recorded (matches `SHOPIFY_APP_SECRET_BANNOS` in Supabase)

---

## 6. Shopify Webhooks - Flourlane Store

**Location:** Flourlane Shopify Admin → Settings → Notifications → Webhooks

### Webhook 1: Order Creation
- [ ] Event: `orders/create` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=flour`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Webhook 2: Order Updated
- [ ] Event: `orders/updated` is configured
- [ ] Format: JSON
- [ ] URL: `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=flour`
- [ ] API Version: 2024-10 (or later)
- [ ] Status: Active/Connected
- [ ] Recent deliveries (last 10) show 200 responses
- [ ] No failed deliveries in last hour

### Flourlane App Credentials
- [ ] App has "Orders" read permission
- [ ] Webhooks are configured in this app (not manually)
- [ ] API secret key is recorded (matches `SHOPIFY_APP_SECRET_FLOURLANE` in Supabase)

---

## 7. Manual Endpoint Tests

**Run these commands in terminal to verify endpoints:**

### Test 1: GET Request (Health Check)
```bash
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] No errors in response

### Test 2: POST Request (Basic)
```bash
curl -i -X POST https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] No errors in response

### Test 3: PUT Request (Non-Order Topic)
```bash
curl -i -X PUT https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] Note: Simplified handler accepts all methods for non-order topics

### Test 4: Flourlane GET Request
```bash
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=flour
```

- [ ] Response status: 200 OK
- [ ] Response body: `ok`
- [ ] No errors in response

---

## 8. Configuration Files Verification

**Location:** Local repository

### File: `supabase/functions/shopify-webhooks/deno.json`
- [ ] File exists
- [ ] Contains import map: `"std/": "https://deno.land/std@0.224.0/"`

### File: `supabase/config.toml`
- [ ] File exists
- [ ] Contains function declaration for `shopify-webhooks`

### File: `supabase/functions/shopify-webhooks/index.ts`
- [ ] Current version: Minimal (36 lines)
- [ ] File is valid TypeScript
- [ ] No syntax errors

### File: `supabase/functions/shopify-webhooks/index_full_backup.ts`
- [ ] File exists
- [ ] Contains full implementation (398-402 lines)
- [ ] Has HMAC verification functions
- [ ] Has idempotency logic
- [ ] Has order splitting/enqueue logic

---

## 9. Cross-Reference Secret Keys

**CRITICAL: Verify HMAC secrets match between Shopify and Supabase**

### Bannos Store
- [ ] Copied HMAC secret from Shopify Bannos app
- [ ] Pasted into Supabase as `SHOPIFY_APP_SECRET_BANNOS`
- [ ] Values match exactly (no extra spaces/newlines)
- [ ] Secret is base64 encoded (if Shopify provides it that way)

### Flourlane Store
- [ ] Copied HMAC secret from Shopify Flourlane app
- [ ] Pasted into Supabase as `SHOPIFY_APP_SECRET_FLOURLANE`
- [ ] Values match exactly (no extra spaces/newlines)
- [ ] Secret is base64 encoded (if Shopify provides it that way)

---

## 10. Review Recent Webhook Activity

**Check Supabase Edge Function Logs**

**Location:** Supabase Dashboard → Edge Functions → shopify-webhooks → Logs (Last 1 hour)

- [ ] Total requests in last hour: _____
- [ ] Successful (200): _____
- [ ] Client errors (4xx): _____
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
- [ ] Secrets match between Shopify and Supabase
- [ ] Database tables and RPC functions exist
- [ ] Edge function is healthy (no boot errors)
- [ ] Manual tests all passed
- [ ] Ready to restore full webhook handler

**Completed by:** _________________  
**Date/Time:** _________________  
**Notes:** 

---

## Next Steps (After Checklist Complete)

Once all items are checked:

1. **If all green:** Proceed with restoring full webhook handler from backup
2. **If issues found:** Fix configuration issues first, then re-verify
3. **Test plan:** Deploy full handler → monitor logs → test with real order

---

**File created:** 2025-11-02  
**For task:** Task 7b - Restore Full Webhook Handler  
**Reference:** PR #157, PR #158

