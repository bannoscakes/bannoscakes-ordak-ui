# Webhook Ingest (Orders → Ordak) — Kitchen-Docket Parity

Purpose: make the webhook show the **exact same information** you trust on the kitchen docket.  
All extraction rules below mirror your docket template.

---

## Source & Idempotency

- **Topic:** `orders/create` (per store)
- **Idempotency key:** `order.admin_graphql_api_id` (`order_gid`)
- If a payload with the same `order_gid` arrives again → **no-op** (return 200)

---

## Store Mapping

Choose table by shop domain:

- `bannos…` → `orders_bannos`  
- `flourlane…` → `orders_flourlane`

---

## Field Mapping (from Metafield)

Orders are ingested from the `ordak.kitchen_json` metafield created by Shopify Flow. The metafield contains:

- `order_number`: Order name (e.g., "#B24422")
- `delivery_date`: Date string (parsed to YYYY-MM-DD format)
- `is_pickup`: Boolean for pickup vs delivery
- `customer_name`: Shipping or customer name
- `order_notes`: Order note
- `order_tags`: Comma-separated tags (cleaned to remove km, $, times)
- `line_items[]`: Array with title, quantity, image_url, properties

Flavour extraction reads from `data.line_items[].properties` for gelato cakes (from metafield).

Notes are taken directly from `data.order_notes` (pre-aggregated by Shopify Flow).

---

## Primary Line Item

The first line item from `data.line_items[]` (metafield) is used for product_title and flavour extraction.

---

## Flavour Extraction Rules

Flavour extraction is performed on the metafield data. For the primary line item only:

Line item properties: search `data.line_items[0].properties` for keys containing "gelato flavour" or "gelato flavours" (case insensitive). Use the associated value, splitting on newlines, commas or / to handle multiple flavours. Trim and join with ", ".

Variant fallback: if no matching property is found, split `variant_title` on / and take the second token. This supports cakes where the flavour is encoded in the variant (e.g. "Chocolate / 10").

---

## Persist Logic (Separate Edge Functions)

Two independent Edge Functions handle webhook ingestion:

- `shopify-webhooks-bannos` → inserts to `orders_bannos`
- `shopify-webhooks-flourlane` → inserts to `orders_flourlane`

Each function:
1. Reads `ordak.kitchen_json` metafield from webhook payload
2. Parses delivery date to YYYY-MM-DD format
3. Cleans order tags
4. Extracts flavours from line item properties
5. Inserts row with stage='Filling'
6. Calls `deduct_on_order_create` RPC
7. Calls `enqueue_order_split` RPC

## Post‑Ingest: Task Splitting

The ingestion pipeline does not split multi‑cake orders into separate records. Instead, splitting happens after ingestion when generating tasks for the kitchen. See `orders-splitting.md` for details on how to create suffixed tasks (A, B, C) and assign accessories to the first ticket. By separating splitting from ingestion, you avoid duplicate records and keep the webhook logic simple and idempotent.

---

## Test Fixtures

Prepare redacted JSON payloads covering edge cases and validate that normalisation produces the expected results:

Gelato cake with flavours in properties: ensure multiple flavours split correctly and variant fallback is not used.

Standard cake with flavours in variant title: confirm the variant fallback extracts the flavour.

Orders with internal properties: verify blacklisted properties are ignored and do not contaminate flavours.

Missing delivery date attribute: ensure tags fallback is used.

Pickup orders: confirm is_pickup is set and due date still extracted.

---

## Implementation Pointer (Pure Normalizer)

A pure function that mirrors the docket rules (attributes-first date/method, property blacklist, flavour extraction).  
Use this in the Edge route **before** any DB writes.

```ts
// src/lib/normalizeShopifyOrder.ts
export function normalizeShopifyOrder(order: any) {
  const toStr = (v: any) => (v == null ? "" : String(v));
  const lc = (s: string) => toStr(s).toLowerCase();

  // Read both note_attributes and attributes[]
  const getAttr = (key: string): string => {
    const fromNotes = (order?.note_attributes || []).find((a: any) => lc(a?.name) === lc(key));
    if (fromNotes?.value) return toStr(fromNotes.value);

    const attrs = order?.attributes;
    if (attrs && typeof attrs === "object") {
      if (Array.isArray(attrs)) {
        const hit = attrs.find((a: any) => lc(a?.name) === lc(key));
        return hit?.value ? toStr(hit.value) : "";
      }
      if (attrs[key] != null) return toStr(attrs[key]);
      const k = Object.keys(attrs).find((k) => lc(k) === lc(key));
      if (k) return toStr(attrs[k]);
    }
    return "";
  };

  const isInternal = (name = "") =>
    !!name &&
    (name.startsWith("_") ||
      name.includes("_origin") ||
      name.includes("_raw") ||
      name.includes("gwp") ||
      name.includes("_LocalDeliveryID"));

  const splitClean = (s: string) =>
    toStr(s).split(/\r?\n|[,/]/).map(x => x.trim()).filter(Boolean);

  // Primary line item for DB fields
  const primary = (order?.line_items || []).find(
    (li: any) => !li?.gift_card && Number(li?.quantity || 0) > 0
  );

  // Flavour: properties → variant fallback
  const fromProps = (): string => {
    const props: any[] = primary?.properties || [];
    const visible = props.filter((p) => !isInternal(p?.name || p?.first));
    const hit = visible.find((p) => /gelato flavour(s)?/i.test(toStr(p?.name || p?.first)));
    const val = toStr(hit?.value || hit?.last || "");
    return splitClean(val).join(", ");
  };

  const fromVariant = (): string => {
    const vt = toStr(primary?.variant_title || "");
    return splitClean(vt)[0] || "";
  };

  const flavour = fromProps() || fromVariant();

  // Human ID (barcode-friendly)
  const shopPrefix = /bannos/i.test(order?.shop_domain || order?.domain || "") ? "bannos" : "flourlane";
  const humanId = `${shopPrefix}-${order?.order_number || order?.id}`;

  // Due date + method (attributes-first, docket parity)
  const rawDue = getAttr("Local Delivery Date and Time");
  let due_date = "";
  if (rawDue) due_date = toStr(rawDue).split(/between/i)[0].trim();

  const methodAttr = lc(getAttr("Delivery Method"));
  const delivery_method = /pickup|pick up/.test(methodAttr) ? "pickup" : "delivery";

  // Notes + delivery instructions
  const notesParts: string[] = [];
  if (order?.note) notesParts.push(toStr(order.note).trim());
  const deliveryInstr = getAttr("Delivery Instructions");
  if (deliveryInstr) notesParts.push(deliveryInstr.trim());
  const notes = notesParts.filter(Boolean).join(" • ");

  return {
    id: humanId,
    shopify_order_id: order?.id,
    shopify_order_gid: order?.admin_graphql_api_id,
    shopify_order_number: order?.order_number,
    customer_name: toStr(order?.shipping_address?.name || order?.customer?.name || "").trim(),
    product_title: toStr(primary?.title || ""),
    flavour,
    notes,
    currency: toStr(order?.presentment_currency || order?.currency || ""),
    total_amount: Number(order?.current_total_price || order?.total_price || 0),
    order_json: order,
    due_date,           // e.g., "2025-09-16" (string from attribute, parsed later in Sydney TZ)
    delivery_method     // "pickup" | "delivery"
  };
}
Summary
Attributes-first for due date & delivery method (matches your docket)

Property blacklist enforced

Flavour comes from properties; variant is a safe fallback

Idempotent ingest keyed by order_gid

Inventory hold via deduct_on_order_create after insert