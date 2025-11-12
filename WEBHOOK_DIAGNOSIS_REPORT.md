# Webhook Failure Diagnosis Report
**Date:** 2025-11-03  
**Status:** Investigation Complete - Issues Found  
**Action Required:** Multiple fixes needed

---

## Executive Summary

After comprehensive analysis of the webhook system, **5 critical issues** were identified that could cause webhook failures:

1. ❌ **CRITICAL:** `deduct_on_order_create` RPC function does not exist
2. ❌ **CRITICAL:** `enqueue_order_split` function signature mismatch
3. ⚠️ **WARNING:** Metafield structure assumption may be incorrect
4. ⚠️ **WARNING:** No error handling for date parsing failures
5. ⚠️ **WARNING:** Shopify webhook payload structure may differ from expected

---

## Issue #1: Missing RPC Function `deduct_on_order_create`

### Problem
The Edge functions (`shopify-webhooks-bannos` and `shopify-webhooks-flourlane`) attempt to call an RPC function `deduct_on_order_create` that **does not exist** in the database.

**Location:** 
```76:92:supabase/functions/shopify-webhooks-bannos/index.ts
// Call stock deduction RPC
if (order.admin_graphql_api_id) {
  await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/deduct_on_order_create`,
    {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_gid: order.admin_graphql_api_id,
        payload: order,
      }),
    }
  ).catch(() => {});
}
```

### Impact
- RPC call fails silently (`.catch(() => {})`)
- Stock deductions are not happening
- No error visible in logs (silently swallowed)
- May cause inventory discrepancies

### Evidence
- Searched all migrations: `deduct_on_order_create` function not found
- Found inventory write functions (`tx_component_consume`, etc.) but no order-specific deduction function
- Edge function expects: `(order_gid, payload)` signature

### Solution Required
1. Create `deduct_on_order_create` RPC function OR
2. Remove the call if not needed OR
3. Replace with appropriate inventory transaction function

---

## Issue #2: Function Signature Mismatch for `enqueue_order_split`

### Problem
The Edge function calls `enqueue_order_split` with parameters `(order_gid, payload)`, but the actual RPC function expects `(p_shop_domain, p_topic, p_hook_id, p_body)`.

**Edge Function Call:**
```96:112:supabase/functions/shopify-webhooks-bannos/index.ts
// Call order split RPC
if (order.admin_graphql_api_id) {
  await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
    {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_gid: order.admin_graphql_api_id,
        payload: order,
      }),
    }
  ).catch(() => {});
}
```

**Actual RPC Signature:**
```5:10:supabase/migrations/023_webhook_enqueue.sql
create or replace function public.enqueue_order_split(
  p_shop_domain text,
  p_topic text,
  p_hook_id text,
  p_body jsonb
)
```

### Impact
- RPC call fails with parameter mismatch error
- Order splitting workflow never triggers
- Multi-cake orders are not split into separate tasks
- Error is silently swallowed (`.catch(() => {})`)

### Solution Required
Update Edge function to match RPC signature:
- Extract `shop_domain` from order (e.g., from `order.shop_domain` or derive from store)
- Pass `topic` as `"orders/create"`
- Extract `hook_id` from webhook headers (`X-Shopify-Webhook-Id`) or use `order.id`
- Pass full order as `p_body`

---

## Issue #3: Metafield Structure Assumption

### Problem
The Edge function assumes `order.metafields` is an array containing the metafield, but Shopify webhook payloads may not include metafields by default.

**Code:**
```13:15:supabase/functions/shopify-webhooks-bannos/index.ts
const metafield = order.metafields?.find(
  (m: any) => m.namespace === "ordak" && m.key === "kitchen_json"
);
```

### Potential Issues
1. **Shopify webhook payloads don't include metafields by default** - They need to be explicitly requested via GraphQL Admin API
2. **Metafield may be created asynchronously** - Shopify Flow may create the metafield AFTER the webhook fires
3. **Race condition** - Webhook fires before Flow completes

### Current Behavior
- Returns 500 if metafield missing (triggers Shopify retry)
- But if metafield is NEVER included in webhook payload, retries will keep failing

### Impact
- Webhooks fail repeatedly if metafields aren't in payload
- No way to know if Flow ran successfully or not
- May need to fetch metafield via Shopify API instead

### Solution Required
1. Verify Shopify webhook includes metafields (check webhook payload structure)
2. If not included, fetch metafield via Shopify Admin API before processing
3. Add retry logic with exponential backoff for metafield fetch

---

## Issue #4: Date Parsing Error Handling

### Problem
The Edge function parses `delivery_date` without validation:

```22:25:supabase/functions/shopify-webhooks-bannos/index.ts
const data = JSON.parse(metafield.value);

// Parse date from metafield
const due_date = new Date(data.delivery_date).toISOString().split('T')[0];
```

### Potential Issues
1. `JSON.parse()` can throw if metafield.value is invalid JSON
2. `new Date()` may return `Invalid Date` if format is unexpected
3. `.toISOString()` will throw on Invalid Date
4. No validation of date format before parsing

### Impact
- Webhook fails with 500 error if date format is wrong
- Error may not be clear in logs
- Order processing stops completely

### Solution Required
- Add try-catch around JSON.parse
- Validate date before parsing
- Add fallback handling for invalid dates

---

## Issue #5: Shopify Webhook Payload Structure

### Problem
The Edge function assumes the webhook payload structure matches Shopify's REST API format, but there may be differences.

### Assumptions Made
- `order.metafields` exists as array
- `order.admin_graphql_api_id` exists
- `order.order_number` exists
- `order.line_items` exists (for metafield parsing)

### Potential Issues
1. Webhook payload structure may differ from REST API
2. Some fields may be nested differently
3. API version may affect field names

### Impact
- Field access failures cause 500 errors
- Silent failures if optional chaining masks issues

### Solution Required
- Log actual webhook payload structure for debugging
- Verify field names match expected structure
- Add defensive checks for all field accesses

---

## Additional Observations

### ✅ What's Working
1. Edge functions are deployed and responding (200 OK on GET requests)
2. Endpoints are accessible: both bannos and flourlane functions respond
3. Configuration exists: `config.toml` has correct `verify_jwt = false` settings
4. Idempotency check exists: duplicate detection via `resolution=ignore-duplicates`

### ⚠️ Potential Issues
1. **No logging of RPC failures** - Silent failures make debugging impossible
2. **No dead letter queue usage** - Failed webhooks aren't captured for retry
3. **No webhook signature verification** - Security concern (though documented as removed)
4. **Environment variables** - Need to verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

---

## Recommended Fix Plan

### Phase 1: Critical Fixes (Immediate)

1. **Create or Fix `deduct_on_order_create` RPC**
   - Option A: Create new RPC function with signature `(order_gid text, payload jsonb)`
   - Option B: Remove call if not needed
   - Option C: Replace with existing inventory transaction function

2. **Fix `enqueue_order_split` Call**
   - Update Edge function to extract required parameters:
     - `shop_domain`: From order metadata or derive from endpoint
     - `topic`: Hardcode as `"orders/create"`
     - `hook_id`: Extract from `X-Shopify-Webhook-Id` header or use `order.id`
     - `body`: Pass full order object

### Phase 2: Reliability Improvements

3. **Add Metafield Fetching Logic**
   - Check if metafields exist in payload
   - If missing, fetch via Shopify Admin API
   - Add retry logic with backoff

4. **Improve Error Handling**
   - Add try-catch around JSON.parse
   - Validate date format before parsing
   - Add detailed error logging
   - Log RPC call failures (don't silently swallow)

5. **Add Defensive Checks**
   - Validate all required fields exist
   - Add type checking for critical fields
   - Log payload structure for debugging

### Phase 3: Monitoring & Debugging

6. **Add Structured Logging**
   - Log webhook payload structure
   - Log RPC call results
   - Log processing steps
   - Include order IDs in all logs

7. **Use Dead Letter Queue**
   - Capture failed webhooks in `dead_letter` table
   - Include error reason
   - Enable manual retry capability

---

## Verification Steps

### Step 1: Check Supabase Logs
```bash
# In Supabase Dashboard → Edge Functions → Logs
# Look for:
- 500 errors from webhook endpoints
- RPC call errors
- JSON parsing errors
- Date parsing errors
```

### Step 2: Check Shopify Webhook Delivery
1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Check "Recent deliveries" for each webhook
3. Look for failed deliveries (non-200 status codes)
4. Click on failed deliveries to see error messages

### Step 3: Test Webhook Payload Structure
Create a test order and capture the webhook payload:
- Check if `metafields` array exists
- Check if `ordak.kitchen_json` metafield is present
- Verify field names match code expectations

### Step 4: Verify RPC Functions Exist
```sql
-- Run in Supabase SQL Editor
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('deduct_on_order_create', 'enqueue_order_split');
```

Expected:
- `enqueue_order_split` should exist ✅
- `deduct_on_order_create` should exist ❌ (currently missing)

### Step 5: Check Environment Variables
In Supabase Dashboard → Edge Functions → Settings:
- Verify `SUPABASE_URL` is set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify values are correct (not empty)

---

## Quick Diagnosis Commands

### Test Edge Function Health
```bash
# Both should return 200 OK
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-bannos
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-flourlane
```

### Check Database Functions
```sql
-- Check if enqueue_order_split exists and signature
SELECT 
  routine_name, 
  routine_definition,
  parameters
FROM information_schema.routines 
WHERE routine_name = 'enqueue_order_split';

-- Check if deduct_on_order_create exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'deduct_on_order_create';
```

### Check Recent Webhook Activity
```sql
-- Check work_queue for recent activity
SELECT * FROM work_queue 
WHERE topic = 'webhook_order_split' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check dead_letter for failures
SELECT * FROM dead_letter 
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent orders
SELECT 
  id, 
  shopify_order_number, 
  created_at 
FROM orders_bannos 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Summary

**Critical Issues Found:** 2  
**Warnings:** 3  
**Status:** Webhooks will fail silently on RPC calls  
**Priority:** Fix RPC function signatures immediately

The main problems are:
1. Missing/incorrect RPC function calls
2. Silent error swallowing hiding failures
3. Potential metafield structure issues

All issues are fixable, but require code changes to Edge functions and potentially database migrations.

---

**Next Steps:**
1. Verify RPC function existence in database
2. Fix function signatures in Edge functions
3. Add proper error logging
4. Test with real webhook payload

**Report Generated:** 2025-11-03  
**Investigator:** AI Assistant  
**Files Analyzed:** 
- `supabase/functions/shopify-webhooks-bannos/index.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.ts`
- `supabase/migrations/023_webhook_enqueue.sql`
- `supabase/config.toml`
- All migration files




