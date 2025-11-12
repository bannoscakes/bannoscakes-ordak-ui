# Webhook Comprehensive Check Report
**Date:** 2025-11-03  
**Status:** ❌ **CRITICAL ISSUES FOUND - WEBHOOKS WILL FAIL**  
**Requested by:** Panos  
**Purpose:** Verify why webhooks still failing after recent metafield implementation and Edge function deployment

---

## Executive Summary

After comprehensive analysis, **3 CRITICAL issues** were identified that **WILL cause webhook failures**:

1. ❌ **CRITICAL:** Missing RPC function `deduct_on_order_create` (Edge functions call non-existent function)
2. ❌ **CRITICAL:** Function signature mismatch for `enqueue_order_split` (Edge functions pass wrong parameters)
3. ❌ **CRITICAL:** Webhook payload likely doesn't include metafields by default

**Current State:** Webhooks return 200 OK but RPC calls fail silently. Orders may be inserted but stock deduction and order splitting are NOT working.

---

## Issue Analysis

### Issue #1: Missing RPC Function `deduct_on_order_create`

**Severity:** 🔴 CRITICAL  
**Impact:** Stock deductions not happening for ANY orders

#### What's Happening
Both Edge functions attempt to call `deduct_on_order_create`:

**File:** `supabase/functions/shopify-webhooks-bannos/index.ts` (lines 76-93)
**File:** `supabase/functions/shopify-webhooks-flourlane/index.ts` (lines 76-93)

```typescript
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
).catch(() => {});  // ⚠️ ERROR SILENTLY SWALLOWED
```

#### Why It's Failing
- The function `deduct_on_order_create` **does not exist** in any migration file
- Available inventory functions: `tx_component_consume`, `tx_component_adjust`, etc. (from migration 035)
- The `.catch(() => {})` silently swallows the error - **no logs, no visibility**

#### Evidence
- Searched all migration files - function not found
- Migration 035 has inventory write wrappers but no `deduct_on_order_create`
- CHANGELOG v0.9.6-beta mentions calling this RPC but implementation missing

---

### Issue #2: Function Signature Mismatch for `enqueue_order_split`

**Severity:** 🔴 CRITICAL  
**Impact:** Order splitting NOT working - multi-cake orders not split into tasks

#### What's Happening
Edge functions call with wrong parameters:

**Edge Function Call:**
```typescript
await fetch(
  `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
  {
    method: "POST",
    body: JSON.stringify({
      order_gid: order.admin_graphql_api_id,  // ❌ Wrong params
      payload: order,                          // ❌ Wrong params
    }),
  }
).catch(() => {});
```

**Actual RPC Signature (migration 023):**
```sql
create or replace function public.enqueue_order_split(
  p_shop_domain text,   -- ❌ MISSING in Edge function call
  p_topic text,         -- ❌ MISSING in Edge function call
  p_hook_id text,       -- ❌ MISSING in Edge function call
  p_body jsonb          -- ❌ Named differently
)
```

#### Why It's Failing
- PostgreSQL will reject the call: "function enqueue_order_split(order_gid => text, payload => jsonb) does not exist"
- Error is silently swallowed by `.catch(() => {})`
- No orders are being queued for splitting

#### Required Fix
Edge functions need to extract and pass:
- `p_shop_domain`: "bannos.myshopify.com" or "flourlane.myshopify.com"
- `p_topic`: "orders/create"
- `p_hook_id`: From `X-Shopify-Webhook-Id` header OR use `order.id.toString()`
- `p_body`: Full order object

---

### Issue #3: Metafield Not in Webhook Payload

**Severity:** 🔴 CRITICAL  
**Impact:** Webhooks fail completely if metafield not included

#### What's Happening
Edge functions expect metafields in webhook payload:

```typescript
const metafield = order.metafields?.find(
  (m: any) => m.namespace === "ordak" && m.key === "kitchen_json"
);

if (!metafield?.value) {
  console.log("Metafield not ready yet, will retry");
  return new Response("retry: metafield not created yet", { status: 500 });
}
```

#### The Problem
**Shopify webhooks DO NOT include metafields by default!**

Shopify webhook payloads for `orders/create` only include:
- Basic order fields (id, order_number, email, etc.)
- Line items
- Customer info
- Shipping/billing addresses

**Metafields are NOT included unless:**
1. You use GraphQL Admin API webhooks (not REST)
2. You explicitly request metafields in the subscription
3. OR you fetch metafields separately via API call

#### Why This Happens
1. Webhook fires immediately when order is created
2. Shopify Flow runs AFTER webhook fires (async, may take seconds)
3. Even if Flow creates metafield, it's NOT in the webhook payload
4. Edge function returns 500, Shopify retries, but metafield still won't be in payload

#### Critical Question
**How is the `ordak.kitchen_json` metafield being delivered to the webhook?**

Possible scenarios:
- ❌ **Expecting it in webhook payload** → Won't work (not included by default)
- ✅ **Shopify Flow creates metafield BEFORE order is created** → Could work if Flow is configured correctly
- ✅ **Webhook fetches metafield via API** → Current code doesn't do this
- ✅ **Using GraphQL webhook subscription with metafields** → Would need to verify in Shopify

---

## Additional Issues

### Issue #4: Silent Error Swallowing

**Severity:** ⚠️ HIGH  
**Impact:** Impossible to debug issues

#### Problem
All RPC calls use `.catch(() => {})` which silently swallows errors:

```typescript
).catch(() => {});  // ⚠️ No logging, no error handling
```

**Why This Is Bad:**
- No visibility into what's failing
- Can't diagnose RPC issues
- Supabase logs show 200 OK even when RPCs fail
- Gives false confidence that webhooks are working

#### Recommended Fix
```typescript
).catch((err) => {
  console.error("RPC deduct_on_order_create failed:", err);
  // Continue processing - don't fail webhook
});
```

---

### Issue #5: Missing Webhook Header Access

**Severity:** ⚠️ MEDIUM  
**Impact:** Can't properly call `enqueue_order_split` or track webhooks

#### Problem
Edge functions don't extract `X-Shopify-Webhook-Id` header, which is needed for:
- Proper `enqueue_order_split` RPC call
- Idempotency tracking (if needed later)
- Debugging and logging

#### Required Change
```typescript
const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();
```

---

### Issue #6: No Shop Domain Detection

**Severity:** ⚠️ MEDIUM  
**Impact:** Can't call `enqueue_order_split` with required `p_shop_domain`

#### Problem
Edge functions don't know which Shopify store sent the webhook. Need to determine:
- Bannos function → "bannoscakes.myshopify.com" (or actual domain)
- Flourlane function → "flourlane.myshopify.com" (or actual domain)

#### Recommended Fix
Hardcode in each function:
```typescript
// In shopify-webhooks-bannos/index.ts
const SHOP_DOMAIN = "bannoscakes.myshopify.com";

// In shopify-webhooks-flourlane/index.ts
const SHOP_DOMAIN = "flourlane.myshopify.com";
```

---

## What's Working ✅

1. ✅ Edge functions deployed and accessible (GET requests return 200 OK)
2. ✅ Configuration correct: `verify_jwt = false` in config.toml
3. ✅ Deno imports using direct URLs (no import map issues)
4. ✅ Idempotency logic correct: `resolution=ignore-duplicates,return=representation`
5. ✅ Order insertion logic appears correct
6. ✅ Tables exist: `orders_bannos`, `orders_flourlane`, `work_queue`, `dead_letter`
7. ✅ Order split worker exists (migration 026) and looks good
8. ✅ Inventory write functions exist (migration 035)

---

## Verification Steps (To Run Now)

### Step 1: Check Supabase Edge Function Logs
**Location:** Supabase Dashboard → Edge Functions → shopify-webhooks-bannos → Logs

**Look for:**
- 500 errors when metafield is missing
- RPC call failures (might not be logged due to silent catch)
- JSON parsing errors
- Any error messages in console.log

### Step 2: Check Shopify Webhook Delivery Status
**Location:** Shopify Admin → Settings → Notifications → Webhooks → Recent Deliveries

**Look for:**
- Failed deliveries (non-200 responses)
- Repeated 500 errors (indicates metafield issue)
- Success responses (200) but orders not appearing in database

### Step 3: Inspect Actual Webhook Payload
**In Shopify webhook delivery details, check:**
- Does payload include `metafields` array?
- Does payload include `ordak.kitchen_json` metafield?
- What does the metafield value look like?
- Are all expected order fields present?

### Step 4: Check Database for Recent Orders
```sql
-- Check if orders are being inserted
SELECT 
  id, 
  shopify_order_number, 
  customer_name,
  created_at 
FROM orders_bannos 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if order split jobs are being created
SELECT * FROM work_queue 
WHERE topic = 'webhook_order_split' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for errors
SELECT * FROM dead_letter 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 5: Verify RPC Functions Exist
```sql
-- Check which RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('deduct_on_order_create', 'enqueue_order_split');
```

**Expected Result:**
- `enqueue_order_split` → EXISTS ✅
- `deduct_on_order_create` → MISSING ❌

---

## Fix Plan (Prioritized)

### 🔴 CRITICAL FIX #1: Determine Metafield Delivery Method

**Action Required:** Verify how metafields are being delivered

**Option A: Metafield in Webhook Payload (Current Assumption)**
- Check Shopify webhook payload structure
- Verify metafield is actually included
- If NOT included → Choose Option B or C

**Option B: Fetch Metafield via API**
```typescript
// If metafield not in payload, fetch it
if (!order.metafields?.find(...)) {
  const metafieldRes = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/2024-10/orders/${order.id}/metafields.json`,
    {
      headers: {
        "X-Shopify-Access-Token": Deno.env.get("SHOPIFY_ACCESS_TOKEN"),
      },
    }
  );
  const metafields = await metafieldRes.json();
  // Find ordak.kitchen_json in response
}
```

**Option C: GraphQL Webhook Subscription**
- Configure Shopify webhook to use GraphQL
- Include metafields in subscription query
- Update Edge function to handle GraphQL payload

**Recommended:** Start with Option A verification, then implement Option B if needed.

---

### 🔴 CRITICAL FIX #2: Fix `enqueue_order_split` Call

**File:** Both `supabase/functions/shopify-webhooks-bannos/index.ts` and `shopify-webhooks-flourlane/index.ts`

**Change From:**
```typescript
body: JSON.stringify({
  order_gid: order.admin_graphql_api_id,
  payload: order,
}),
```

**Change To:**
```typescript
const SHOP_DOMAIN = "bannoscakes.myshopify.com"; // or "flourlane.myshopify.com"
const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();

// Later in the code:
body: JSON.stringify({
  p_shop_domain: SHOP_DOMAIN,
  p_topic: "orders/create",
  p_hook_id: hookId,
  p_body: order,
}),
```

**Required Changes:**
1. Extract `X-Shopify-Webhook-Id` header at top of handler
2. Define `SHOP_DOMAIN` constant (different for each function)
3. Update RPC call parameters to match function signature

---

### 🔴 CRITICAL FIX #3: Create `deduct_on_order_create` RPC OR Remove Call

**Option A: Create the RPC Function**

Create new migration: `036_deduct_on_order_create.sql`

```sql
-- 036_deduct_on_order_create.sql
-- RPC to deduct stock when order is created
-- Called from webhook Edge functions (best-effort)

create or replace function public.deduct_on_order_create(
  p_order_gid text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line_items jsonb;
  v_item jsonb;
  v_component uuid;
  v_qty numeric;
begin
  -- Extract line items from payload
  v_line_items := p_payload->'line_items';
  
  -- For each line item, find matching component and deduct
  for v_item in select * from jsonb_array_elements(v_line_items)
  loop
    -- TODO: Map Shopify SKU to component_id
    -- This is placeholder logic - adjust based on your inventory system
    
    -- Skip if no SKU or quantity
    if (v_item->>'sku') is null or (v_item->>'quantity')::numeric = 0 then
      continue;
    end if;
    
    -- Find component by SKU (adjust this query to match your schema)
    select id into v_component
    from components
    where sku = (v_item->>'sku')
    limit 1;
    
    if v_component is null then
      -- Component not found, skip (don't fail)
      continue;
    end if;
    
    -- Deduct stock
    v_qty := (v_item->>'quantity')::numeric;
    perform public.tx_component_consume(
      v_component,
      v_qty,
      null, -- order UUID (if you have it)
      jsonb_build_object(
        'order_gid', p_order_gid,
        'source', 'webhook'
      )
    );
  end loop;
  
exception when others then
  -- Don't fail - log and continue
  raise warning 'deduct_on_order_create failed for %: %', p_order_gid, SQLERRM;
end;
$$;

comment on function public.deduct_on_order_create(text, jsonb)
  is 'Best-effort stock deduction when order is created via webhook.';
```

**Option B: Remove the RPC Call**

If stock deduction should happen elsewhere (e.g., when order is assigned), remove the RPC call:

```typescript
// Delete or comment out lines 76-93 in both Edge functions
// Stock deduction will be handled elsewhere in the workflow
```

**Recommendation:** Discuss with Panos which approach is correct for the business logic.

---

### ⚠️ HIGH PRIORITY FIX #4: Add Error Logging

**File:** Both Edge functions

**Change From:**
```typescript
).catch(() => {});
```

**Change To:**
```typescript
).catch((err) => {
  console.error("RPC enqueue_order_split failed:", {
    order_id: order.id,
    order_gid: order.admin_graphql_api_id,
    error: err.message || err,
  });
});
```

Apply to both `deduct_on_order_create` and `enqueue_order_split` calls.

---

### ⚠️ MEDIUM PRIORITY FIX #5: Add Better Error Handling

**Add date validation:**
```typescript
const data = JSON.parse(metafield.value);

// Validate delivery_date exists
if (!data.delivery_date) {
  console.error("Missing delivery_date in metafield:", { order_id: order.id });
  return new Response("error: missing delivery_date", { status: 500 });
}

// Parse and validate date
let due_date;
try {
  const dateObj = new Date(data.delivery_date);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date");
  }
  due_date = dateObj.toISOString().split('T')[0];
} catch (err) {
  console.error("Invalid delivery_date format:", {
    order_id: order.id,
    delivery_date: data.delivery_date,
  });
  return new Response("error: invalid date format", { status: 500 });
}
```

---

## Testing Plan (After Fixes)

### Test 1: Create Test Order in Shopify
1. Create order in Bannos store
2. Verify Shopify Flow creates metafield
3. Check webhook delivery status (should be 200)
4. Verify order appears in `orders_bannos` table
5. Verify `work_queue` has `webhook_order_split` job
6. Check Supabase logs for any errors

### Test 2: Verify RPC Calls
1. Check Edge function logs for RPC call errors
2. Query `work_queue` for split jobs: `SELECT * FROM work_queue WHERE topic = 'webhook_order_split'`
3. Check if split worker processes jobs (if worker is running)
4. Verify no entries in `dead_letter` table

### Test 3: Multi-Cake Order
1. Create order with 2 cakes
2. Verify single order inserted
3. Verify order split job created
4. Run split worker: `SELECT process_webhook_order_split(10)`
5. Verify 2 kitchen tasks created (A and B suffixes)

---

## Summary

**Root Causes Identified:**
1. ❌ Missing RPC function `deduct_on_order_create`
2. ❌ Wrong parameters passed to `enqueue_order_split`
3. ❌ Unclear if metafields are in webhook payload
4. ❌ Silent error swallowing hides all issues

**Impact:**
- Webhooks appear to work (200 OK)
- Orders may be inserted
- BUT: Stock deduction NOT happening
- BUT: Order splitting NOT happening
- Hard to debug due to silent failures

**Next Steps:**
1. Verify metafield delivery method (check actual webhook payload in Shopify)
2. Fix `enqueue_order_split` RPC call parameters (CRITICAL)
3. Create `deduct_on_order_create` RPC OR remove call (CRITICAL)
4. Add error logging (HIGH)
5. Test with real order
6. Monitor logs and database

**Estimated Effort:**
- Critical fixes: 1-2 hours
- Testing: 30 minutes
- Monitoring: Ongoing

---

**Report Prepared By:** AI Assistant  
**Date:** 2025-11-03  
**Status:** Ready for Review & Implementation  
**Next Action:** Review with Panos → Implement fixes → Test → Deploy




