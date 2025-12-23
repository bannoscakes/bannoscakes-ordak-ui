import { useQuery } from '@tanstack/react-query';
import { getQueue } from '../lib/rpc-client';

const REFETCH_INTERVAL = 60_000; // 60 seconds

/**
 * Hook to get count of orders needing attention (missing due_date)
 * across both stores. Used in supervisor dashboard.
 */
export function useNeedsAttentionCount() {
  return useQuery({
    queryKey: ['needsAttentionCount'],
    queryFn: async () => {
      const [bannosOrders, flourlaneOrders] = await Promise.all([
        getQueue({ store: 'bannos', limit: 999999 }),
        getQueue({ store: 'flourlane', limit: 999999 }),
      ]);

      const allOrders = [...bannosOrders, ...flourlaneOrders];

      // Filter to only non-complete orders without due_date
      const needsAttention = allOrders.filter(
        (order) => !order.due_date && order.stage !== 'Complete'
      );

      return {
        total: needsAttention.length,
        bannos: needsAttention.filter((o) => o.store === 'bannos').length,
        flourlane: needsAttention.filter((o) => o.store === 'flourlane').length,
      };
    },
    staleTime: 30_000,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}
