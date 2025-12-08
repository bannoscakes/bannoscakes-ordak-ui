# Webhook Ingest (Orders → Ordak) — Metafield-Driven

Purpose: Ingest orders from Shopify webhooks using the `ordak.kitchen_json` metafield created by Shopify Flow.

---

## Source & Idempotency

- **Topic:** `orders/create` (per store)
- **Idempotency key:** `order.admin_graphql_api_id` (order_gid)
- Check: Query database for existing `shopify_order_gid` before insert
- If exists → return 200 (no-op, no duplicate processing)

---

## Store Separation

Two separate Edge Functions handle webhooks independently:

- **Bannos:** `shopify-webhooks-bannos` → inserts to `orders_bannos`
- **Flourlane:** `shopify-webhooks-flourlane` → inserts to `orders_flourlane`

Each function:
- Has its own deployment URL
- Is completely independent
- Can be deployed/tested separately
- If one breaks, the other continues working

---

## Field Mapping (from Metafield)

All order data comes from the `ordak.kitchen_json` metafield created by Shopify Flow.

| Target column | Source |
|---|---|
| `id` | `bannos-<order_number>` or `flourlane-<order_number>` |
| `shopify_order_id` | `order.id` (from webhook) |
| `shopify_order_gid` | `order.admin_graphql_api_id` (from webhook) |
| `shopify_order_number` | `order.order_number` (from webhook) |
| `customer_name` | `metafield.customer_name` |
| `product_title` | `metafield.line_items[0].title` |
| `flavour` | `metafield.line_items[0].properties["Gelato Flavours"]` or empty string |
| `notes` | `metafield.order_notes` |
| `currency` | `order.currency` (from webhook) |
| `total_amount` | `order.total_price` (from webhook) |
| `order_json` | Full raw webhook payload (jsonb) |
| `stage` | 'Filling' (hardcoded) |
| `due_date` | Parse `metafield.delivery_date` to YYYY-MM-DD format |
| `delivery_method` | `metafield.is_pickup` ? "pickup" : "delivery" |

---

## Date Parsing

The metafield contains human-readable dates (e.g., "Fri 28 Nov 2025"). Convert to PostgreSQL date format:
```typescript
const due_date = new Date(data.delivery_date).toISOString().split('T')[0];
// Input: "Fri 28 Nov 2025"
// Output: "2025-11-28"
```

---

## Flavour Extraction

Read from metafield line items properties:
```typescript
const flavour = data.line_items[0]?.properties?.["Gelato Flavours"] || "";
```

For sponge cakes, the properties object is empty, resulting in empty flavour (correct behavior).

---

## Persist Logic (Edge Function Flow)

Each Edge Function follows this sequence:

1. **Read metafield:** Extract `ordak.kitchen_json` from webhook payload
2. **Idempotency check:** Query database for existing `shopify_order_gid`
   - If exists → return 200 immediately (skip all remaining steps)
3. **Parse delivery date:** Convert string to YYYY-MM-DD format
4. **Extract flavour:** Read from metafield line items properties
5. **Build row:** Map all fields to database columns
6. **Insert:** Write to appropriate table with `resolution=ignore-duplicates`
7. **Stock deduction:** Call `deduct_on_order_create(order_gid, payload)` RPC (best-effort, non-blocking)
8. **Order splitting:** Call `enqueue_order_split(order_gid, payload)` RPC (best-effort, non-blocking)
9. **Return 200:** Acknowledge webhook to Shopify

If any step fails before insert → return 500 (Shopify will retry)
If RPC calls fail → tolerate silently (best-effort)

---

## Post-Ingest: Task Splitting

The ingestion pipeline does NOT split multi-cake orders into separate records. Splitting happens asynchronously via `enqueue_order_split` RPC. See `docs/orders-splitting.md` for task generation details.

---

## Deployment

Deploy each function independently:
```bash
# Deploy Bannos webhook
npm run fn:deploy:bannos

# Deploy Flourlane webhook
npm run fn:deploy:flourlane
```

Configure Shopify webhook URLs:

- **Bannos store:** `https://{project}.supabase.co/functions/v1/shopify-webhooks-bannos`
- **Flourlane store:** `https://{project}.supabase.co/functions/v1/shopify-webhooks-flourlane`

---
