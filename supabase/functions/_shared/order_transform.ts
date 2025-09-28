export type NormalizedOrder = {
  id: string;                            // human id: "<store>-<order_number|id>"
  store: 'bannos' | 'flourlane';
  shopify_order_id: number | string;
  shopify_order_gid: string;
  shopify_order_number: number | string;
  customer_name: string;
  product_title: string;
  flavour: string;                       // may be ""
  notes: string;                         // order.note + Delivery Instructions
  currency: string;
  total_amount: number;
  order_json: any;                       // full raw payload
  due_date: string;                      // attributes-first; part before "between", trimmed
  delivery_method: 'pickup' | 'delivery';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';   // derived from due_date (today/overdue=HIGH; tomorrow=HIGH; <=3d=MED)
};

type Issue = { path: string; message: string };

const toStr = (v: any) => (v == null ? "" : String(v));
const lc = (s: string) => toStr(s).toLowerCase();
const isBlank = (v: any) => v == null || (typeof v === "string" && v.trim() === "");

/** Read from note_attributes[] or attributes (array or object), case-insensitive key match */
function getAttr(order: any, key: string): string {
  const keyLc = lc(key);
  const fromNotes = (order?.note_attributes || []).find((a: any) => lc(a?.name) === keyLc);
  if (fromNotes?.value) return toStr(fromNotes.value);

  const attrs = order?.attributes;
  if (attrs && typeof attrs === "object") {
    if (Array.isArray(attrs)) {
      const hit = attrs.find((a: any) => lc(a?.name) === keyLc);
      return hit?.value ? toStr(hit.value) : "";
    }
    if (key in attrs) return toStr((attrs as any)[key]);
    const k = Object.keys(attrs).find((k) => lc(k) === keyLc);
    if (k) return toStr((attrs as any)[k]);
  }
  return "";
}

/** internal/blacklisted property names, matching the docket rules */
function isInternalPropName(name = ""): boolean {
  return !!name && (
    name.startsWith("_") ||
    name.includes("_origin") ||
    name.includes("_raw") ||
    name.includes("gwp") ||
    name.includes("_LocalDeliveryID")
  );
}

/** split helper for flavours (multiline, commas, slash) */
function splitClean(s: string): string[] {
  return toStr(s).split(/\r?\n|[,/]/).map(x => x.trim()).filter(Boolean);
}

/** first non-gift line item with quantity > 0 */
function pickPrimaryLineItem(order: any): any | undefined {
  const items = order?.line_items || [];
  return items.find((li: any) => !li?.gift_card && Number(li?.quantity || 0) > 0);
}

/** derive priority from due date (Sydney, date-only; transform stage uses local date) */
function derivePriority(dueISO: string): 'HIGH'|'MEDIUM'|'LOW' {
  // Treat dueISO as YYYY-MM-DD (no time). Compare to "today" in local env.
  const today = new Date();
  const baseToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = dueISO.split("-").map(Number);
  const due = new Date(y, (m || 1) - 1, d || 1).getTime();
  if (Number.isNaN(due)) return 'LOW';
  const deltaDays = Math.floor((due - baseToday) / 86400000);
  if (deltaDays <= 1) return 'HIGH';     // today/overdue/tomorrow
  if (deltaDays <= 3) return 'MEDIUM';
  return 'LOW';
}

/** main normalizer (pure) — mirrors your "Implementation Pointer" */
export function normalizeShopifyOrder(order: any, store: 'bannos'|'flourlane'):
  | { ok: true; normalized: NormalizedOrder }
  | { ok: false; errors: Issue[] }
{
  const issues: Issue[] = [];

  // Required presence (idempotency + minimum fields)
  const gid = toStr(order?.admin_graphql_api_id || "");
  if (isBlank(gid)) issues.push({ path: 'admin_graphql_api_id', message: 'missing' });

  const orderId = order?.id;
  if (isBlank(orderId)) issues.push({ path: 'id', message: 'missing' });

  const orderNumber = order?.order_number;
  if (isBlank(orderNumber)) issues.push({ path: 'order_number', message: 'missing' });

  const primary = pickPrimaryLineItem(order);
  if (!primary) issues.push({ path: 'line_items', message: 'no primary line item (non-gift, qty>0)' });

  // Customer name (shipping then customer), docket parity
  const customerName = toStr(order?.shipping_address?.name || order?.customer?.name || "").trim();
  if (isBlank(customerName)) issues.push({ path: 'customer_name', message: 'missing' });

  // Due date (attributes-first), take part before "between"
  const rawDue = getAttr(order, 'Local Delivery Date and Time');
  let due_date = "";
  if (rawDue) {
    due_date = toStr(rawDue).split(/between/i)[0].trim();
  } else {
    // Fallback: tags like DEL:YYYY-MM-DD or PICKUP:YYYY-MM-DD (optional)
    const tags = (order?.tags || "").toString().split(",").map((t: string) => t.trim());
    const tagHit = tags.find((t: string) => /^DEL:|^PICKUP:/i.test(t));
    if (tagHit) {
      const maybeDate = tagHit.split(":")[1]?.trim();
      if (maybeDate) due_date = maybeDate;
    }
  }
  if (isBlank(due_date)) issues.push({ path: 'due_date', message: 'missing (attributes-first)' });

  // Delivery method (attributes-first)
  const methodAttr = lc(getAttr(order, 'Delivery Method'));
  const delivery_method: 'pickup' | 'delivery' = /pickup|pick up/.test(methodAttr) ? 'pickup' : 'delivery';

  // Flavour: properties named "Gelato Flavour(s)" (case-insens), blacklist internal → variant fallback
  const fromProps = (): string => {
    const props: any[] = (primary?.properties || []).filter((p: any) => !isInternalPropName(toStr(p?.name || p?.first)));
    const hit = props.find((p: any) => /gelato flavour(s)?/i.test(toStr(p?.name || p?.first)));
    const val = toStr(hit?.value || hit?.last || "");
    return splitClean(val).join(", ");
  };
  const fromVariant = (): string => {
    const vt = toStr(primary?.variant_title || "");
    return splitClean(vt)[0] || "";
  };
  const flavour = fromProps() || fromVariant(); // allowed to be ""

  // Notes aggregation: order.note + Delivery Instructions
  const notesParts: string[] = [];
  if (order?.note) notesParts.push(toStr(order.note).trim());
  const deliveryInstr = getAttr(order, 'Delivery Instructions');
  if (deliveryInstr) notesParts.push(deliveryInstr.trim());
  const notes = notesParts.filter(Boolean).join(" • ");

  // Human ID (barcode-friendly)
  const humanId = `${store}-${(order?.order_number ?? order?.id)}`;

  // Summary fields
  const currency = toStr(order?.presentment_currency || order?.currency || "");
  const total_amount = Number(order?.current_total_price || order?.total_price || 0);
  const product_title = toStr(primary?.title || "");

  if (issues.length) return { ok: false, errors: issues };

  const normalized: NormalizedOrder = {
    id: humanId,
    store,
    shopify_order_id: orderId,
    shopify_order_gid: gid,
    shopify_order_number: orderNumber,
    customer_name: customerName,
    product_title,
    flavour,
    notes,
    currency,
    total_amount,
    order_json: order,
    due_date,
    delivery_method,
    priority: derivePriority(due_date),
  };

  return { ok: true, normalized };
}
