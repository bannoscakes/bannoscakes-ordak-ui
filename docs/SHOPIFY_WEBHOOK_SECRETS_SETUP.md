# Shopify Webhook Secrets Setup Guide

**When to use:** After creating a new app in Shopify or rotating webhook secrets.

---

## Step 1: Get Secrets from Shopify Apps

### For Bannos Store
1. Go to **Bannos Shopify Admin** → **Apps** → Your app (or **Settings** → **Apps and sales channels** → **Develop apps** → Your app)
2. Click on your app
3. Under **API credentials** or **App credentials**, find:
   - **Client Secret** or **API Secret** (this is the HMAC secret)
4. **Copy the entire secret** (it's usually a long base64 string)
5. Keep it secure and don't share it publicly

### For Flourlane Store
1. Repeat the same steps for the **Flourlane Shopify Admin**
2. Copy the **Client Secret** or **API Secret** for the Flourlane app

**Note:** The secret is different for each app/store. You need one secret per store.

---

## Step 2: Set Secrets in Supabase

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd /Users/panospanayi/Documents/bannoscakes-ordak-ui

# Set the Bannos secret
supabase secrets set SHOPIFY_APP_SECRET_BANNOS="YOUR_BANNOS_SECRET_HERE"

# Set the Flourlane secret
supabase secrets set SHOPIFY_APP_SECRET_FLOURLANE="YOUR_FLOURLANE_SECRET_HERE"

# Verify they were set (this will show if they exist, but not their values)
supabase secrets list
```

### Option B: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → **shopify-webhooks**
2. Click **Settings** (or the gear icon)
3. Scroll to **Secrets** section
4. Click **Add secret** or **Edit** for each:
   - **Key:** `SHOPIFY_APP_SECRET_BANNOS`
     - **Value:** Paste your Bannos app secret
     - Click **Save**
   - **Key:** `SHOPIFY_APP_SECRET_FLOURLANE`
     - **Value:** Paste your Flourlane app secret
     - Click **Save**

5. **Verify:** Click "Reveal" next to each secret to confirm they match your Shopify apps

---

## Step 3: Verify Required Secrets Are Set

The following secrets should be set in Supabase Edge Functions:

- ✅ `SHOPIFY_APP_SECRET_BANNOS` - For Bannos store HMAC validation
- ✅ `SHOPIFY_APP_SECRET_FLOURLANE` - For Flourlane store HMAC validation
- ✅ `SUPABASE_URL` - Should be: `https://iwavciibrspfjezujydc.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - For RPC calls
- ✅ `SUPABASE_ANON_KEY` - For API calls

**Optional:**
- `SHOPIFY_APP_SECRET` - Legacy fallback (if you have a single shared secret)

---

## Step 4: Verify Webhook URLs in Shopify

After setting secrets, verify your webhook endpoints are correct:

### Bannos Store Webhooks
- **URL:** `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos`
- **Events:** `orders/create` and `orders/updated`
- **Format:** JSON
- **API Version:** 2024-10 (or later)

### Flourlane Store Webhooks
- **URL:** `https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=flour`
- **Events:** `orders/create` and `orders/updated`
- **Format:** JSON
- **API Version:** 2024-10 (or later)

**Location:** Shopify Admin → Settings → Notifications → Webhooks

---

## Step 5: Test the Webhook Endpoints

Run these commands to verify endpoints are responding:

```bash
# Test Bannos endpoint
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=bannos

# Test Flourlane endpoint
curl -i https://iwavciibrspfjezujydc.supabase.co/functions/v1/shopify-webhooks?store=flour
```

Expected response: `200 OK` with body `ok`

---

## Step 6: Monitor Webhook Delivery

### In Shopify Admin
1. Go to **Settings** → **Notifications** → **Webhooks**
2. Click on each webhook
3. Check **Recent deliveries** - should show `200` responses
4. Look for any failed deliveries

### In Supabase Dashboard
1. Go to **Edge Functions** → **shopify-webhooks** → **Logs**
2. Check last hour of logs
3. Should see `200` responses for webhook deliveries
4. No `401` (unauthorized) or `500` (server error) responses

---

## Troubleshooting

### If webhooks are failing with 401 Unauthorized:
- ✅ Double-check the secret values match exactly between Shopify and Supabase
- ✅ Ensure no extra spaces or newlines in the secret
- ✅ Verify you're using the correct secret for each store (Bannos vs Flourlane)
- ✅ Verify secret names match exactly: `SHOPIFY_APP_SECRET_BANNOS` and `SHOPIFY_APP_SECRET_FLOURLANE`
- ✅ Check that the secret is from the correct Shopify app

### If webhooks are failing with 500 Server Error:
- ✅ Check Supabase Edge Function logs for errors
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- ✅ Verify `SUPABASE_URL` is correct
- ✅ Check database tables exist (`processed_webhooks`, `work_queue`, etc.)

### If webhooks show as delivered but orders aren't appearing:
- ✅ Check Supabase Edge Function logs for processing errors
- ✅ Verify RPC functions exist (`enqueue_order_split`)
- ✅ Check database tables for inserted records

---

## Security Notes

- ⚠️ **Never commit secrets** to git
- ⚠️ **Never share secrets** in public channels
- ⚠️ Secrets should be rotated every 90 days or on staff changes
- ⚠️ Each store needs its own secret (Bannos and Flourlane are different)

---

## Quick Checklist

- [ ] Copied secret from Bannos Shopify app
- [ ] Copied secret from Flourlane Shopify app
- [ ] Set `SHOPIFY_APP_SECRET_BANNOS` in Supabase
- [ ] Set `SHOPIFY_APP_SECRET_FLOURLANE` in Supabase
- [ ] Verified secrets match exactly (no extra spaces)
- [ ] Tested webhook endpoints (200 OK responses)
- [ ] Verified webhook URLs in Shopify Admin
- [ ] Checked recent webhook deliveries (all 200)
- [ ] No errors in Supabase Edge Function logs

---

**Last Updated:** 2025-01-27  
**Related:** `WEBHOOKS_CONFIG_CHECKLIST.md`

