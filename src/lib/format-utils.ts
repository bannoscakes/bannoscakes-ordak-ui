/**
 * Format an order number with the appropriate store prefix.
 * @param orderId - The raw order ID or number (e.g., "12345" or "#B12345")
 * @param store - The store identifier ('bannos' or 'flourlane')
 * @returns Formatted order number with store prefix (e.g., "#B12345" or "#F12345")
 */
export function formatOrderNumber(orderId: string, store: 'bannos' | 'flourlane'): string {
  const num = orderId.replace(/\D/g, '');
  return store === 'bannos' ? `#B${num}` : `#F${num}`;
}
