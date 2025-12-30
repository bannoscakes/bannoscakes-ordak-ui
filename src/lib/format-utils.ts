/**
 * Format a date to Australian format (dd/mm/yyyy).
 * Uses UTC getters to avoid off-by-one errors when ISO date-only strings
 * (e.g., "2024-12-25") are parsed as UTC midnight but displayed in local time.
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted date string (e.g., "25/12/2024") or empty string if invalid
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format an order number with the appropriate store prefix.
 *
 * **Split Order Convention:**
 * When a Shopify order contains multiple cakes, it is split into separate orders
 * in the database. Each split order gets a suffix (-A, -B, etc.) stored in the `id` field:
 * - Single cake order: `id = "bannos-25771"` → displays as `#B25771`
 * - Split order (cake 1): `id = "bannos-25771-A"` → displays as `#B25771-A`
 * - Split order (cake 2): `id = "bannos-25771-B"` → displays as `#B25771-B`
 *
 * The -A order always carries the accessories from the original Shopify order.
 *
 * @param orderId - The raw order ID or number (e.g., "12345", "#B12345", "B12345")
 * @param store - The store identifier ('bannos' or 'flourlane')
 * @param id - Optional full order id (e.g., "bannos-25771-A") to extract suffix for split orders
 * @returns Formatted order number with store prefix (e.g., "#B12345" or "#B12345-A")
 *
 * @example
 * // Single order
 * formatOrderNumber(25771, 'bannos') // "#B25771"
 *
 * // Split order with suffix
 * formatOrderNumber(25771, 'bannos', 'bannos-25771-A') // "#B25771-A"
 */
export function formatOrderNumber(
  orderId: string | number | null | undefined,
  store: 'bannos' | 'flourlane',
  id?: string | null
): string {
  const prefix = store === 'bannos' ? '#B' : '#F';

  // Extract suffix from id if provided (e.g., "bannos-25771-A" → "-A")
  let suffix = '';
  if (id) {
    const match = id.match(/-([A-Z])$/);
    if (match) {
      suffix = `-${match[1]}`;
    }
  }

  // Coerce to string and handle falsy values
  const idStr = orderId != null ? String(orderId).trim() : '';

  // If already has correct prefix, return with suffix if applicable
  if (idStr.startsWith('#B') || idStr.startsWith('#F')) {
    // Check if already has suffix
    if (/-[A-Z]$/.test(idStr)) {
      return idStr;
    }
    return `${idStr}${suffix}`;
  }

  // If starts with B or F (without #), add #
  if (idStr.startsWith('B') || idStr.startsWith('F')) {
    // Check if it looks like a prefixed order number (letter followed by digits, optional suffix)
    if (/^[BF]\d+(-[A-Z])?$/.test(idStr)) {
      // Check if already has suffix
      if (/-[A-Z]$/.test(idStr)) {
        return `#${idStr}`;
      }
      return `#${idStr}${suffix}`;
    }
  }

  // Extract digits only
  const num = idStr.replace(/\D/g, '');

  // Return fallback if no digits found
  if (!num) {
    return `${prefix}UNKNOWN`;
  }

  return `${prefix}${num}${suffix}`;
}
