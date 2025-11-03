# Shopify Webhook Setup Guide

**Note:** HMAC verification has been removed. No secrets needed for webhook authentication.

---

## Step 1: Verify Required Supabase Secrets

The following secrets should be set in Supabase Edge Functions:

- ✅ `SUPABASE_URL` - Should be: `https://iwavciibrspfjezujydc.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - For RPC calls
- ✅ `SUPABASE_ANON_KEY` - For API calls

### Verify Using Supabase CLI

```bash
# Navigate to your project directory
cd /Users/panospanayi/Documents/bannoscakes-ordak-ui

# List all secrets (this will show if they exist, but not their values)
supabase secrets list
```

### Verify Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings**
2. Scroll to **Secrets** section
3. Verify the above secrets are present
4. Click "Reveal" next to each secret to confirm they are not empty

---

## Step 2: Configure Webhook URLs in Shopify

Each store has its own dedicated webhook endpoint (no query parameters needed).

### Bannos Store Webhooks

**Location:** Bannos Shopify Admin → Settings → Notifications → Webhooks

1. Click **Create webhook**
2. Configure:
   - **Event:** `orders/create`
   - **Format:** JSON
   - **URL:** `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-bannos`
   - **API Version:** 2024-10 (or later)
3. Click **Save**

### Flourlane Store Webhooks

**Location:** Flourlane Shopify Admin → Settings → Notifications → Webhooks

1. Click **Create webhook**
2. Configure:
   - **Event:** `orders/create`
   - **Format:** JSON
   - **URL:** `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-flourlane`
   - **API Version:** 2024-10 (or later)
3. Click **Save**

---

## Step 3: Test the Webhook Endpoints

Run these commands to verify endpoints are responding:

```bash
# Test Bannos endpoint
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-bannos

# Test Flourlane endpoint
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks-flourlane
```

Expected response: `200 OK` with body `ok`

---

## Step 4: Monitor Webhook Delivery

### In Shopify Admin

1. Go to **Settings** → **Notifications** → **Webhooks**
2. Click on each webhook
3. Check **Recent deliveries** - should show `200` responses
4. Look for any failed deliveries

### In Supabase Dashboard

1. Go to **Edge Functions** → **shopify-webhooks-bannos** (or **shopify-webhooks-flourlane**) → **Logs**
2. Check last hour of logs
3. Should see `200` responses for webhook deliveries
4. No `500` (server error) responses

---

## Troubleshooting

### If webhooks are failing with 500 Server Error:

- ✅ Check Supabase Edge Function logs for errors
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- ✅ Verify `SUPABASE_URL` is correct
- ✅ Check database tables exist (`orders_bannos`, `orders_flourlane`)
- ✅ Verify the `ordak.kitchen_json` metafield is being created by Shopify Flow

### If webhooks show as delivered but orders aren't appearing:

- ✅ Check Supabase Edge Function logs for processing errors
- ✅ Verify RPC functions exist (`deduct_on_order_create`, `enqueue_order_split`)
- ✅ Check database tables for inserted records
- ✅ Verify Shopify Flow is creating the `ordak.kitchen_json` metafield on orders

### If metafield is missing:

- ✅ Check Shopify Flow is configured correctly
- ✅ Verify the Flow action creates a metafield with namespace `ordak` and key `kitchen_json`
- ✅ Test with a sample order in Shopify to confirm the Flow runs

---

## Security Notes

- ⚠️ **Never commit secrets** to git
- ⚠️ **Never share secrets** in public channels
- ⚠️ Secrets should be rotated every 90 days or on staff changes

---

## Quick Checklist

- [ ] Verified `SUPABASE_URL` is set in Supabase
- [ ] Verified `SUPABASE_SERVICE_ROLE_KEY` is set in Supabase
- [ ] Verified `SUPABASE_ANON_KEY` is set in Supabase
- [ ] Configured Bannos webhook URL (without query parameters)
- [ ] Configured Flourlane webhook URL (without query parameters)
- [ ] Tested both webhook endpoints (200 OK responses)
- [ ] Verified webhook URLs in Shopify Admin
- [ ] Checked recent webhook deliveries (all 200)
- [ ] No errors in Supabase Edge Function logs
- [ ] Verified Shopify Flow creates `ordak.kitchen_json` metafield

---

**Last Updated:** 2025-11-03  
**Related:** `WEBHOOKS_CONFIG_CHECKLIST.md`, `docs/webhook-ingest.md`
