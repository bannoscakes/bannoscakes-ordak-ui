/**
 * Format an order number with the appropriate store prefix.
 * @param orderId - The raw order ID or number (e.g., "12345", "#B12345", "B12345")
 * @param store - The store identifier ('bannos' or 'flourlane')
 * @returns Formatted order number with store prefix (e.g., "#B12345" or "#F12345")
 */
export function formatOrderNumber(orderId: string | number | null | undefined, store: 'bannos' | 'flourlane'): string {
  const prefix = store === 'bannos' ? '#B' : '#F';

  // Coerce to string and handle falsy values
  const idStr = orderId != null ? String(orderId).trim() : '';

  // If already has correct prefix, return as is
  if (idStr.startsWith('#B') || idStr.startsWith('#F')) {
    return idStr;
  }

  // If starts with B or F (without #), add #
  if (idStr.startsWith('B') || idStr.startsWith('F')) {
    // Check if it looks like a prefixed order number (letter followed by digits)
    if (/^[BF]\d+$/.test(idStr)) {
      return `#${idStr}`;
    }
  }

  // Extract digits only
  const num = idStr.replace(/\D/g, '');

  // Return fallback if no digits found
  if (!num) {
    return `${prefix}UNKNOWN`;
  }

  return `${prefix}${num}`;
}
