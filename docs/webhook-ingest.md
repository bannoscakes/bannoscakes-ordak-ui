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

## Field Mapping (DB)

| Target column | Source / Rule |
|---|---|
| `id` | `bannos-<order_number>` or `flourlane-<order_number>` (fallback: `<prefix>-<order.id>`) |
| `shopify_order_id` | `order.id` |
| `shopify_order_gid` | `order.admin_graphql_api_id` |
| `shopify_order_number` | `order.order_number` |
| `customer_name` | `order.shipping_address.name` else `order.customer.name` |
| `product_title` | **Primary** line item title (see “Primary line item”) |
| `flavour` | From **Flavour Extraction Rules** (below) |
| `notes` | `order.note` + (optional) **Delivery Instructions** attribute |
| `currency` | `order.presentment_currency` else `order.currency` |
| `total_amount` | `order.current_total_price` else `order.total_price` |
| `order_json` | full raw payload (`jsonb`) |
| `stage` | `'Filling'` |
| `priority` | Derived from `due_date`: High (today/overdue), Medium (tomorrow), Low (later) |
| timestamps | start as `NULL`; Filling starts on **barcode print** |

---

## Due Date & Delivery Method (Attributes-first, docket-parity)

- **Due date attribute:** `order.attributes['Local Delivery Date and Time']`  
  - Take the part **before** the word **“between”**, then `trim` (e.g., `"2025-09-16"`).
- **Delivery method attribute:** `order.attributes['Delivery Method']` (lowercased)  
  - If it contains `"pickup"` / `"pick up"` → `delivery_method='pickup'`  
  - Otherwise → `delivery_method='delivery'`

**Fallbacks** (only if the attribute is missing): parse note attributes or tags like `DEL:YYYY-MM-DD`, `PICKUP:YYYY-MM-DD`.  
**Timezone:** interpret dates in **Australia/Sydney**.

---

## Notes Aggregation

- Start with `order.note` if present
- If present, append **Delivery Instructions** from a known attribute key, e.g. `order.attributes['Delivery Instructions']`
- Join parts with ` • `

---

## Primary Line Item

For DB fields like `product_title`, use the **first non-gift** line item with `quantity > 0`.  
(The docket prints all items; DB needs one “primary” for summary.)

---

## Flavour Extraction Rules (Kitchen Parity)

**Priority order (first hit wins):**

1) **Line item properties** on the primary item (case-insensitive name match):  
   - Keys that include **“gelato flavour”** or **“gelato flavours”**  
   - Value can be multi-line or comma/`/` separated → split and trim → join with `, `

2) **Variant/options fallback** for the primary item:  
   - Use the first token of `variant_title` if that token is a flavour label

**Property blacklist (skip these names exactly like the docket):**

- Names that **start with `_`**  
- Names that **contain** `_origin`, `_raw`, `gwp`, `_LocalDeliveryID`

> If nothing yields a flavour, leave `flavour` empty and log a warning (non-fatal).

---

## Persist Logic (Edge Function using Service Role)

1) Verify HMAC with `SHOPIFY_WEBHOOK_SECRET`  
2) Deduplicate by `order_gid` (if exists → **no-op**, return 200)  
3) Normalize payload (fields above)  
4) Insert into `orders_<store>`  
5) Call `deduct_on_order_create(order_gid, payload)` to write stock txns and enqueue `work_queue`  
6) (Optional) Append `order_ingested` event

**On errors**

- Invalid HMAC → 401 (Shopify won’t count as delivered)  
- Unexpected exception → 500 (Shopify retries; we remain idempotent)

---

## Test Fixtures (must pass)

Prepare real (redacted) JSON examples for:

- Bannos gelato cake with flavours in **line item properties** (`Gelato Flavours`)  
- Flourlane order with flavours in **note attributes** or variant title fallback  
- Orders containing **internal** properties (blacklist must skip them)  
- Due date from **Local Delivery Date and Time** attribute; method from **Delivery Method** attribute  
- Tag-based due date as fallback

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