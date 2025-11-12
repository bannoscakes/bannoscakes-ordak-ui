# Webhook Fix Plan - Quick Reference
**Date:** 2025-11-03  
**Status:** Action Required

---

## 🔴 Critical Issues Summary

| Issue | Impact | Status | Priority |
|-------|--------|--------|----------|
| Missing `deduct_on_order_create` RPC | Stock deductions NOT working | ❌ | P0 |
| Wrong params to `enqueue_order_split` | Order splitting NOT working | ❌ | P0 |
| Metafield not in webhook payload? | Webhooks may fail entirely | ⚠️ Need to verify | P0 |
| Silent error swallowing | Can't see what's failing | ❌ | P1 |

---

## 🎯 Action Plan

### Step 1: Verify Metafield Delivery (FIRST THING TO CHECK)

**Go to:** Shopify Admin → Settings → Notifications → Webhooks → Click on webhook → Recent deliveries → View payload

**Check:**
- [ ] Does payload have `"metafields": [...]` array?
- [ ] Does it include metafield with `"namespace": "ordak"` and `"key": "kitchen_json"`?
- [ ] If YES → Good, continue to Step 2
- [ ] If NO → Need to implement API fetch OR fix Shopify Flow timing

**If metafield is missing from payload:**
You'll need to either:
- Fix Shopify Flow to run BEFORE webhook fires, OR
- Add API call to fetch metafield in Edge function

---

### Step 2: Fix `enqueue_order_split` RPC Call (CRITICAL)

**Files to Change:**
- `supabase/functions/shopify-webhooks-bannos/index.ts`
- `supabase/functions/shopify-webhooks-flourlane/index.ts`

**Changes Required:**

#### Change 1: Add constants at top of file
```typescript
// At top of file (after imports)
// For bannos function:
const SHOP_DOMAIN = "bannoscakes.myshopify.com";

// For flourlane function:
const SHOP_DOMAIN = "flourlane.myshopify.com";
```

#### Change 2: Extract webhook ID from headers
```typescript
// Inside serve() function, after order is parsed:
const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();
```

#### Change 3: Fix RPC call parameters (lines ~96-111)
**BEFORE:**
```typescript
body: JSON.stringify({
  order_gid: order.admin_graphql_api_id,
  payload: order,
}),
```

**AFTER:**
```typescript
body: JSON.stringify({
  p_shop_domain: SHOP_DOMAIN,
  p_topic: "orders/create",
  p_hook_id: hookId,
  p_body: order,
}),
```

---

### Step 3: Fix `deduct_on_order_create` (CRITICAL)

**Option A: Create the RPC**
- Create new migration: `supabase/migrations/036_deduct_on_order_create.sql`
- See full SQL in comprehensive report
- Needs to map Shopify SKUs to component IDs
- Calls `tx_component_consume` for each line item

**Option B: Remove the call (if not needed yet)**
- Comment out lines 76-93 in both Edge functions
- Stock deduction happens elsewhere in workflow

**Decision Needed:** Panos to confirm which approach

---

### Step 4: Add Error Logging (HIGH PRIORITY)

**Files to Change:**
- Both Edge functions

**Find lines with:** `.catch(() => {})`  
**Change to:**
```typescript
.catch((err) => {
  console.error("RPC call failed:", {
    rpc: "enqueue_order_split", // or "deduct_on_order_create"
    order_id: order.id,
    order_gid: order.admin_graphql_api_id,
    error: err.message || String(err),
  });
  // Don't fail the webhook - continue processing
})
```

---

## 📋 Complete Code Changes

### File: `supabase/functions/shopify-webhooks-bannos/index.ts`

**Full updated version:**
```typescript
// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SHOP_DOMAIN = "bannoscakes.myshopify.com";

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const order = await req.json();
    const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();
    
    // Read metafield created by Shopify Flow
    const metafield = order.metafields?.find(
      (m: any) => m.namespace === "ordak" && m.key === "kitchen_json"
    );
    
    if (!metafield?.value) {
      console.log("Metafield not ready yet, will retry", {
        order_id: order.id,
        hook_id: hookId,
      });
      return new Response("retry: metafield not created yet", { status: 500 });
    }
    
    const data = JSON.parse(metafield.value);
    
    // Parse date from metafield with validation
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
    
    // Extract data from metafield
    const delivery_method = data.is_pickup ? "pickup" : "delivery";
    const primaryItem = data.line_items?.[0] || {};
    
    // Build row for database
    const row = {
      id: `bannos-${order.order_number || order.id}`,
      shopify_order_id: order.id,
      shopify_order_gid: order.admin_graphql_api_id,
      shopify_order_number: order.order_number,
      customer_name: data.customer_name || "",
      product_title: primaryItem.title || "",
      flavour: primaryItem.properties?.["Gelato Flavours"] || "",
      notes: data.order_notes || "",
      currency: order.currency || "AUD",
      total_amount: Number(order.total_price || 0),
      order_json: order,
      stage: "Filling",
      due_date,
      delivery_method
    };
    
    // Insert with duplicate detection
    const insertRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/orders_bannos`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify(row),
      }
    );
    
    if (!insertRes.ok) {
      console.error("Insert failed:", await insertRes.text());
      return new Response("error", { status: 500 });
    }
    
    // Check if row was actually inserted
    const insertedRows = await insertRes.json();
    if (!insertedRows || insertedRows.length === 0) {
      console.log("Order already exists, skipping RPCs", {
        order_id: order.id,
        order_gid: order.admin_graphql_api_id,
      });
      return new Response("ok", { status: 200 });
    }
    
    console.log("Order inserted successfully", {
      order_id: order.id,
      order_gid: order.admin_graphql_api_id,
      internal_id: row.id,
    });
    
    // Call stock deduction RPC
    // NOTE: Verify this function exists or remove this call
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
            p_order_gid: order.admin_graphql_api_id,
            p_payload: order,
          }),
        }
      ).catch((err) => {
        console.error("RPC deduct_on_order_create failed:", {
          order_id: order.id,
          order_gid: order.admin_graphql_api_id,
          error: err.message || String(err),
        });
      });
    }
    
    // Call order split RPC (FIXED PARAMETERS)
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
            p_shop_domain: SHOP_DOMAIN,
            p_topic: "orders/create",
            p_hook_id: hookId,
            p_body: order,
          }),
        }
      ).catch((err) => {
        console.error("RPC enqueue_order_split failed:", {
          order_id: order.id,
          order_gid: order.admin_graphql_api_id,
          error: err.message || String(err),
        });
      });
    }
    
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", {
      error: err.message || String(err),
      stack: err.stack,
    });
    return new Response("error", { status: 500 });
  }
});
```

### File: `supabase/functions/shopify-webhooks-flourlane/index.ts`

**Same changes as above, but:**
- Change `SHOP_DOMAIN` to `"flourlane.myshopify.com"`
- Change `id` prefix to `flourlane-` instead of `bannos-`
- Target table: `orders_flourlane`

---

## 🧪 Testing Checklist

After deploying fixes:

### Pre-Test Verification
- [ ] Check Supabase secrets are set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Verify RPC functions exist: Run SQL query in comprehensive report
- [ ] Check Edge functions deployed: `supabase functions list`

### Test 1: Simple Order
- [ ] Create test order in Shopify (Bannos store)
- [ ] Check Shopify webhook delivery: Should be 200 OK
- [ ] Check Supabase Edge function logs: No errors
- [ ] Query database: `SELECT * FROM orders_bannos ORDER BY created_at DESC LIMIT 1`
- [ ] Verify order exists with correct data

### Test 2: Verify RPC Calls
- [ ] Check logs for "RPC enqueue_order_split failed" - should NOT appear
- [ ] Query work_queue: `SELECT * FROM work_queue WHERE topic = 'webhook_order_split' ORDER BY created_at DESC LIMIT 1`
- [ ] Should see job with correct shop_domain, topic, hook_id

### Test 3: Multi-Cake Order
- [ ] Create order with 2+ cakes
- [ ] Verify order inserted
- [ ] Verify split job created in work_queue
- [ ] Run worker: `SELECT process_webhook_order_split(10);`
- [ ] Check kitchen tasks created with A, B suffixes

---

## 📊 Monitoring Queries

**Check recent orders:**
```sql
SELECT id, shopify_order_number, customer_name, created_at 
FROM orders_bannos 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check work queue:**
```sql
SELECT id, topic, status, created_at, payload->>'order_id' as order_id
FROM work_queue 
WHERE topic = 'webhook_order_split'
ORDER BY created_at DESC 
LIMIT 10;
```

**Check for errors:**
```sql
SELECT * FROM dead_letter 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check RPC functions:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('deduct_on_order_create', 'enqueue_order_split');
```

---

## 🚀 Deployment Commands

**After making code changes:**

```bash
# Deploy Bannos webhook function
npm run fn:deploy:bannos

# Deploy Flourlane webhook function
npm run fn:deploy:flourlane

# Check deployment status
supabase functions list

# View logs (live)
supabase functions logs shopify-webhooks-bannos --tail
```

**If creating new migration:**
```bash
# Create migration
# (Manually create: supabase/migrations/036_deduct_on_order_create.sql)

# Apply migration (if using local DB)
npm run migrate

# Or push to remote
supabase db push
```

---

## ✅ Success Criteria

**Webhooks are working correctly when:**
1. ✅ Orders appear in database immediately after Shopify order creation
2. ✅ No errors in Supabase Edge function logs
3. ✅ `work_queue` has entries for `webhook_order_split` topic
4. ✅ Worker can process split jobs without errors
5. ✅ Multi-cake orders create multiple kitchen tasks
6. ✅ Shopify webhook delivery shows 200 OK consistently

---

## 🆘 If Issues Persist

**Check these locations:**
1. Supabase Dashboard → Edge Functions → Logs (last 1 hour)
2. Shopify Admin → Webhooks → Recent deliveries
3. Database: `dead_letter` table
4. Database: Check if orders are being inserted
5. Verify environment variables are set correctly

**Common issues:**
- Metafield not in payload → Need to fetch via API or fix Flow timing
- RPC function doesn't exist → Create migration or remove call
- Wrong parameters → Double-check function signature vs call
- Silent failures → Check error logging is working

---

**Prepared:** 2025-11-03  
**Owner:** Panos  
**Next Review:** After implementing fixes  
**Related:** WEBHOOK_COMPREHENSIVE_CHECK_2025-11-03.md




