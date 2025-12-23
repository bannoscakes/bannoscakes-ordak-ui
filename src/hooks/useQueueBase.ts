import { useQueryClient } from '@tanstack/react-query';
import type { QueueItem, QueueItemStatus, QueueItemStore } from '../types/queue';
import type { GetQueueRow } from '../types/supabase';

/** Auto-refresh interval for queue hooks (30 seconds) */
export const QUEUE_REFETCH_INTERVAL = 30_000;

/**
 * Map database stage to UI status
 */
export function mapStageToStatus(stage: string): QueueItemStatus {
  switch (stage) {
    case 'Filling':
    case 'Covering':
    case 'Decorating':
      return 'In Production';
    case 'Packing':
      return 'Quality Check';
    case 'Complete':
      return 'Completed';
    default:
      return 'Pending';
  }
}

/**
 * Validate store value, defaulting to 'bannos' if invalid
 */
function normalizeStore(store: string | null | undefined): QueueItemStore {
  if (store === 'bannos' || store === 'flourlane') return store;
  return 'bannos';
}

/**
 * Map database order to UI format
 */
export function mapOrderToQueueItem(order: GetQueueRow): QueueItem {
  const normalizedMethod = order.delivery_method?.trim().toLowerCase();
  const hasDueDate = !!order.due_date;

  return {
    id: order.id,
    orderNumber: String(order.human_id || order.shopify_order_number || order.id),
    shopifyOrderNumber: String(order.shopify_order_number || ''),
    customerName: order.customer_name || 'Unknown Customer',
    product: order.product_title || 'Unknown Product',
    size: order.size || 'Unknown',
    quantity: order.item_qty || 1,
    deliveryTime: order.due_date || new Date().toISOString(),
    priority: order.priority || 'Medium',
    status: mapStageToStatus(order.stage),
    flavor: order.flavour || 'Unknown',
    dueTime: order.due_date || new Date().toISOString(),
    method: normalizedMethod === 'delivery' ? 'Delivery'
          : normalizedMethod === 'pickup' ? 'Pickup'
          : undefined,
    storage: order.storage || 'Default',
    store: normalizeStore(order.store),
    stage: order.stage || 'Filling',
    covering_start_ts: order.covering_start_ts ?? null,
    decorating_start_ts: order.decorating_start_ts ?? null,
    needsAttention: !hasDueDate,
  };
}

/**
 * Factory to create queue invalidation hooks
 */
export function useQueueInvalidator(queryKeyPrefix: string) {
  const queryClient = useQueryClient();

  return async (userId?: string) => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, userId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    }
  };
}
