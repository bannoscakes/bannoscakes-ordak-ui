/**
 * Shared queue types for staff and supervisor queue hooks
 */

import type { ShippingAddress } from '../lib/rpc-client';

export type QueueItemSize = string;
export type QueueItemPriority = 'High' | 'Medium' | 'Low';
export type QueueItemStatus = 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
export type QueueItemMethod = 'Delivery' | 'Pickup';
export type QueueItemStore = 'bannos' | 'flourlane';

/**
 * Accessory item from Shopify line items
 */
export interface AccessoryItem {
  title: string;
  quantity: number;
  price: string;
  variant_title?: string | null;
}

/**
 * Shared QueueItem type used across all queue-related components.
 *
 * Used by staff workspace, supervisor views, queue tables, order drawers,
 * scanner overlays, and assignment modals.
 *
 * @remarks
 * - `shopifyOrderNumber` is optional as not all data sources provide it
 * - Both `cakeWriting` and `writingOnCake` are supported for backwards compatibility
 * - `accessories` can be AccessoryItem[] (structured) or string[] (legacy display)
 */
export interface QueueItem {
  id: string;
  orderNumber: string;
  /** Shopify order number - optional as not all sources provide this */
  shopifyOrderNumber?: string;
  customerName: string;
  product: string;
  size: QueueItemSize;
  quantity: number;
  dueDate: string | null;
  priority: QueueItemPriority | null;
  status: QueueItemStatus;
  flavour: string;
  method?: QueueItemMethod;
  storage?: string;
  store: QueueItemStore;
  stage: string;
  // Timestamps for stage tracking
  covering_start_ts?: string | null;
  decorating_start_ts?: string | null;
  // Shopify order ID for admin URLs
  shopifyOrderId?: number;
  // Assignment fields
  assigneeId?: string;
  assigneeName?: string;
  // Order detail fields
  cakeWriting?: string;
  writingOnCake?: string;
  notes?: string;
  productImage?: string | null;
  accessories?: AccessoryItem[] | null;
  shippingAddress?: ShippingAddress | null;
}
