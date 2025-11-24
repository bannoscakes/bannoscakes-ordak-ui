# 🚀 PROCESSOR UPDATE - GraphQL Support Added

## ✅ What Was Fixed

1. **Dual Format Support**: Processor now detects and handles BOTH REST and GraphQL webhooks
2. **Format Detection**: Automatically identifies webhook format before processing
3. **GraphQL Normalization**: Converts GraphQL structure to common format
4. **Order Number Extraction**: Extracts `22588` from GraphQL `"#B22588"` format
5. **GID Parsing**: Handles Shopify Global IDs like `gid://shopify/ProductVariant/43914980262045`

## ⚠️ Known Issues (Need Your Input)

### Issue 1: Missing Fields in GraphQL Webhooks

GraphQL webhooks are **missing critical fields** that REST webhooks have:

**Missing in GraphQL:**
- ❌ `note` (customer notes/requests)
- ❌ `note_attributes` (delivery date, delivery method, etc.)
- ❌ `product.id` (needed for image fetching)
- ❌ `customAttributes` on line items (flavour/size properties)

**Available in GraphQL:**
- ✅ Customer name
- ✅ Line items with titles
- ✅ Variant titles
- ✅ Shipping address
- ✅ Tags (but not the same as note_attributes)

### Issue 2: Can't Fetch Images for GraphQL Orders

Without `product.id`, I can't fetch images from Shopify Admin API for GraphQL webhooks.

**Options:**
1. Extract product ID from variant GID (might work)
2. Use a different GraphQL query to get product info
3. Accept that GraphQL webhooks won't have images initially

### Issue 3: Can't Extract Delivery Info

`deliveryDate` and `deliveryMethod` come from `note_attributes` which don't exist in GraphQL webhooks.

**Possible workarounds:**
- Parse from `tags` array (saw: `"Sat 13 Dec 2025"`, `"Delivery"`)
- Leave blank for GraphQL orders
- Configure GraphQL webhooks differently in Shopify

## 📊 Current Status

**Database Stats:**
- Bannos: 221 GraphQL + 346 REST = 567 total webhooks
- Flourlane: 340 GraphQL + 462 REST = 802 total webhooks

**Processor Status:**
- ✅ Deployed to Supabase
- ✅ Detects formats correctly (tested with 3 GraphQL webhooks)
- ❌ Fails to process GraphQL due to missing fields
- ✅ Should work fine with REST webhooks

## 🎯 Recommendations

### Short Term:
Test processor with REST webhooks first - those should work immediately since they have all required fields.

```bash
# Find a REST webhook and test
curl -X POST https://iwavciibrspfjezujydc.supabase.co/functions/v1/process-inbox \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"store": "bannos", "limit": 10}'
```

### Long Term Options:

**Option A:** Configure Shopify to send REST webhooks only
- All webhooks would have consistent format
- Full field coverage
- Images would work

**Option B:** Enhance GraphQL support
- Parse delivery info from tags
- Find alternative way to get product IDs
- Accept some data might be missing

**Option C:** Dual Strategy
- Process REST webhooks normally (with images)
- Process GraphQL webhooks with partial data (no images initially)
- Backfill images later via separate job

## 📝 What to Test in PR

1. **Verify code quality**
2. **Check GraphQL normalization logic**
3. **Decide on missing fields strategy**
4. **Test with REST webhooks first**

---

**Current Branch:** `feature/inbox-processor`  
**Commits:** 4 commits (table names, env vars, accessories, GraphQL support)  
**Ready for:** Your PR review and testing decisions

