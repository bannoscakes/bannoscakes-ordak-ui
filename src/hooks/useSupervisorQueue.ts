import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueue } from '../lib/rpc-client';

// Auto-refresh interval (30 seconds)
const SUPERVISOR_QUEUE_REFETCH_INTERVAL = 30_000;

/**
 * Queue item interface matching the UI format
 */
export interface SupervisorQueueItem {
  id: string;
  orderNumber: string;
  shopifyOrderNumber: string;
  customerName: string;
  product: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  store: 'bannos' | 'flourlane';
  stage: string;
  covering_start_ts?: string | null;
  decorating_start_ts?: string | null;
}

/**
 * Map database stage to UI status
 */
function mapStageToStatus(stage: string): SupervisorQueueItem['status'] {
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
 * Map database order to UI format
 */
function mapOrderToQueueItem(order: any): SupervisorQueueItem {
  const normalizedMethod = order.delivery_method?.trim().toLowerCase();

  return {
    id: order.id,
    orderNumber: String(order.human_id || order.shopify_order_number || order.id),
    shopifyOrderNumber: String(order.shopify_order_number || ''),
    customerName: order.customer_name || 'Unknown Customer',
    product: order.product_title || 'Unknown Product',
    size: order.size || 'M',
    quantity: order.item_qty || 1,
    deliveryTime: order.due_date || new Date().toISOString(),
    priority: order.priority || 'Medium', // DB returns string enum: 'High' | 'Medium' | 'Low'
    status: mapStageToStatus(order.stage),
    flavor: order.flavour || 'Unknown',
    dueTime: order.due_date || new Date().toISOString(),
    method: normalizedMethod === 'delivery' ? 'Delivery'
          : normalizedMethod === 'pickup' ? 'Pickup'
          : undefined,
    storage: order.storage || 'Default',
    store: order.store || 'bannos',
    stage: order.stage || 'Filling',
    covering_start_ts: order.covering_start_ts ?? null,
    decorating_start_ts: order.decorating_start_ts ?? null,
  };
}

/**
 * Hook for supervisor queue data - orders assigned to the current supervisor
 *
 * Features:
 * - Fetches from both stores (bannos + flourlane)
 * - Auto-refreshes every 30 seconds
 * - Refetches on window focus
 * - Integrated with React Query cache invalidation
 */
export function useSupervisorQueue(userId: string | undefined) {
  return useQuery({
    queryKey: ['supervisorQueue', userId],
    queryFn: async () => {
      if (!userId) return [];

      const [bannosOrders, flourlaneOrders] = await Promise.all([
        getQueue({ store: 'bannos', assignee_id: userId, limit: 999999 }),
        getQueue({ store: 'flourlane', assignee_id: userId, limit: 999999 }),
      ]);

      // Combine orders from both stores
      const allOrders = [...bannosOrders, ...flourlaneOrders];

      return allOrders.map(mapOrderToQueueItem);
    },
    enabled: !!userId,
    staleTime: SUPERVISOR_QUEUE_REFETCH_INTERVAL,
    refetchInterval: SUPERVISOR_QUEUE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch supervisor queue
 * Use after mutations (complete order, etc.)
 */
export function useInvalidateSupervisorQueue() {
  const queryClient = useQueryClient();

  return async (userId?: string) => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: ['supervisorQueue', userId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });
    }
  };
}
