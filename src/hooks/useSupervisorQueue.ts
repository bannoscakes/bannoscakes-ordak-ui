import { useQuery } from '@tanstack/react-query';
import { getQueue } from '../lib/rpc-client';
import { QUEUE_REFETCH_INTERVAL, mapOrderToQueueItem, useQueueInvalidator } from './useQueueBase';
import type { QueueItem } from '../types/queue';

// Re-export for backwards compatibility
export type SupervisorQueueItem = QueueItem;

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
    staleTime: QUEUE_REFETCH_INTERVAL,
    refetchInterval: QUEUE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch supervisor queue
 * Use after mutations (complete order, etc.)
 */
export function useInvalidateSupervisorQueue() {
  return useQueueInvalidator('supervisorQueue');
}
