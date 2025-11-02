// @ts-nocheck - Deno globals are available in Supabase Edge Functions runtime
// supabase/functions/shopify-webhooks/normalize.ts

/**
 * Normalize Shopify order webhooks to match kitchen docket format.
 * 
 * Implements exact extraction rules from webhook-ingest.md:
 * - Attributes-first for dates and delivery method
 * - Property blacklist enforcement
 * - Flavour extraction (properties → variant fallback)
 * - Tag fallback for due dates
 * 
 * @param order - Raw Shopify order payload from webhook
 * @returns Normalized order data ready for DB insertion
 */
export function normalizeShopifyOrder(order: any) {
  const toStr = (v: any) => (v == null ? "" : String(v));
  const lc = (s: string) => toStr(s).toLowerCase();

  // Read both note_attributes and attributes (case-insensitive)
  const getAttr = (key: string): string => {
    const eq = (a: string, b: string) => lc(a) === lc(b);
    const notes = Array.isArray(order?.note_attributes) ? order.note_attributes : [];
    const an = notes.find((a: any) => eq(a?.name ?? "", key));
    if (an?.value) return toStr(an.value);

    const attrs = order?.attributes;
    if (attrs && typeof attrs === "object") {
      if (Array.isArray(attrs)) {
        const hit = attrs.find((a: any) => eq(a?.name ?? "", key));
        return hit?.value ? toStr(hit.value) : "";
      }
      const k = Object.keys(attrs).find((k) => eq(k, key));
      if (k) return toStr((attrs as any)[k]);
    }
    return "";
  };

  // Blacklist internal properties (matches docket behavior)
  const isInternal = (name = "") =>
    !!name &&
    (name.startsWith("_") ||
      name.includes("_origin") ||
      name.includes("_raw") ||
      name.includes("gwp") ||
      name.includes("_LocalDeliveryID"));

  const splitClean = (s: string) => toStr(s).split(/\r?\n|[,/]/).map(x => x.trim()).filter(Boolean);

  // Primary line item (first non-gift, positive quantity)
  const primary = (order?.line_items || []).find(
    (li: any) => !li?.gift_card && Number(li?.quantity || 0) > 0
  );

  // Flavour extraction: properties → variant fallback
  const fromProps = () => {
    const props: any[] = primary?.properties || [];
    const visible = props.filter((p) => !isInternal(p?.name || p?.first));
    const hit = visible.find((p) => /gelato flavour(s)?/i.test(toStr(p?.name || p?.first)));
    const val = toStr(hit?.value || hit?.last || "");
    return splitClean(val).join(", ");
  };

  const fromVariant = () => {
    const vt = toStr(primary?.variant_title || "");
    return splitClean(vt)[0] || "";
  };

  const flavour = fromProps() || fromVariant();

  // Due date: attributes first, then tag fallback (DEL:YYYY-MM-DD or PICKUP:YYYY-MM-DD)
  const rawDue = getAttr("Local Delivery Date and Time");
  let due_date = "";
  if (rawDue) {
    const m = toStr(rawDue).split(/between/i)[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(m)) due_date = m;
  }
  if (!due_date && Array.isArray(order?.tags)) {
    // Tags as array
    const t = order.tags.find((t: string) => /^DEL:|^PICKUP:/i.test(t));
    if (t) {
      const m = String(t).match(/(?:DEL:|PICKUP:)(\d{4}-\d{2}-\d{2})/i);
      if (m) due_date = m[1];
    }
  } else if (typeof order?.tags === "string") {
    // Tags as comma-separated string
    const m = String(order.tags).match(/(?:DEL:|PICKUP:)(\d{4}-\d{2}-\d{2})/i);
    if (m) due_date = m[1];
  }

  // Delivery method (attributes-first)
  const methodAttr = lc(getAttr("Delivery Method"));
  const delivery_method = /pickup|pick up/.test(methodAttr) ? "pickup" : "delivery";

  // Notes aggregation (order.note + Delivery Instructions)
  const notesParts: string[] = [];
  if (order?.note) notesParts.push(toStr(order.note).trim());
  const deliveryInstr = getAttr("Delivery Instructions");
  if (deliveryInstr) notesParts.push(deliveryInstr.trim());
  const notes = notesParts.filter(Boolean).join(" • ");

  // Shop prefix for table routing and human ID
  const shopDomain = lc(order?.shop_domain || order?.domain || "");
  const shopPrefix = shopDomain.includes("bannos") ? "bannos" : "flourlane";
  const humanId = `${shopPrefix}-${order?.order_number || order?.id}`;

  return {
    shopPrefix,                 // 'bannos' | 'flourlane' (for table routing)
    id: humanId,
    shopify_order_id: order?.id,
    shopify_order_gid: order?.admin_graphql_api_id,  // idempotency key
    shopify_order_number: order?.order_number,
    customer_name: toStr(order?.shipping_address?.name || order?.customer?.name || "").trim(),
    product_title: toStr(primary?.title || ""),
    flavour,
    notes,
    currency: toStr(order?.presentment_currency || order?.currency || ""),
    total_amount: Number(order?.current_total_price || order?.total_price || 0),
    order_json: order,
    due_date,
    delivery_method
  };
}

