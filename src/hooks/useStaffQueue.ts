import { useQuery } from '@tanstack/react-query';
import { getQueue } from '../lib/rpc-client';
import { QUEUE_REFETCH_INTERVAL, mapOrderToQueueItem, useQueueInvalidator } from './useQueueBase';
import type { QueueItem } from '../types/queue';

// Re-export for backwards compatibility
export type StaffQueueItem = QueueItem;

/**
 * Hook for staff queue data - orders assigned to the current user
 *
 * Features:
 * - Fetches from both stores (bannos + flourlane)
 * - Excludes completed orders
 * - Auto-refreshes every 30 seconds
 * - Refetches on window focus
 * - Integrated with React Query cache invalidation
 *
 * @param userId - The staff member's user ID. Query is disabled if undefined.
 * @returns React Query result with `data` as array of {@link QueueItem}
 *
 * @example
 * const { data: queue, isLoading } = useStaffQueue(user?.id);
 *
 * if (isLoading) return <Spinner />;
 * return <QueueList items={queue} />;
 */
export function useStaffQueue(userId: string | undefined) {
  return useQuery({
    queryKey: ['staffQueue', userId],
    queryFn: async () => {
      if (!userId) return [];

      const [bannosOrders, flourlaneOrders] = await Promise.all([
        getQueue({ store: 'bannos', assignee_id: userId, limit: 999999 }),
        getQueue({ store: 'flourlane', assignee_id: userId, limit: 999999 }),
      ]);

      // Combine orders from both stores, excluding Complete stage
      const allOrders = [...bannosOrders, ...flourlaneOrders]
        .filter((order) => order.stage !== 'Complete');

      return allOrders.map(mapOrderToQueueItem);
    },
    enabled: !!userId,
    staleTime: QUEUE_REFETCH_INTERVAL,
    refetchInterval: QUEUE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch the staff queue
 *
 * Use after mutations that affect queue state (e.g., completing an order).
 *
 * @returns Function that invalidates the `staffQueue` query key
 *
 * @example
 * const invalidate = useInvalidateStaffQueue();
 * await completeOrder(orderId);
 * invalidate();
 */
export function useInvalidateStaffQueue() {
  return useQueueInvalidator('staffQueue');
}
