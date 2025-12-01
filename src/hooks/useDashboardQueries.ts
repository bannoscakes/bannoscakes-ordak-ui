import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueueStats, getUnassignedCounts, getQueue } from '../lib/rpc-client';
import type { Store } from '../types/db';

// Auto-refresh interval for dashboard data (30 seconds)
const DASHBOARD_REFETCH_INTERVAL = 30_000;

/**
 * Hook for queue statistics (total orders, stage counts, etc.)
 * Used by: MetricCards, ProductionStatus
 */
export function useQueueStats(store: Store) {
  return useQuery({
    queryKey: ['queueStats', store],
    queryFn: () => getQueueStats(store),
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for unassigned order counts by stage
 * Used by: UnassignedStations
 */
export function useUnassignedCounts(store: Store) {
  return useQuery({
    queryKey: ['unassignedCounts', store],
    queryFn: () => getUnassignedCounts(store),
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for recent orders list
 * Used by: RecentOrders
 */
export function useRecentOrders(store: Store, limit = 5) {
  return useQuery({
    queryKey: ['recentOrders', store, limit],
    queryFn: () => getQueue({
      store,
      limit,
      sort_by: 'due_date',
      sort_order: 'ASC',
    }),
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook to prefetch data for another store (used on tab hover)
 * Preloads data before user clicks, making tab switch instant
 */
export function usePrefetchStore() {
  const queryClient = useQueryClient();

  return (targetStore: Store) => {
    // Prefetch all dashboard queries for the target store
    queryClient.prefetchQuery({
      queryKey: ['queueStats', targetStore],
      queryFn: () => getQueueStats(targetStore),
    });
    
    queryClient.prefetchQuery({
      queryKey: ['unassignedCounts', targetStore],
      queryFn: () => getUnassignedCounts(targetStore),
    });
    
    queryClient.prefetchQuery({
      queryKey: ['recentOrders', targetStore, 5],
      queryFn: () => getQueue({
        store: targetStore,
        limit: 5,
        sort_by: 'due_date',
        sort_order: 'ASC',
      }),
    });
  };
}

/**
 * Hook to invalidate all dashboard queries (used for manual refresh)
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return (store?: Store) => {
    if (store) {
      // Invalidate specific store
      queryClient.invalidateQueries({ queryKey: ['queueStats', store] });
      queryClient.invalidateQueries({ queryKey: ['unassignedCounts', store] });
      queryClient.invalidateQueries({ queryKey: ['recentOrders', store] });
    } else {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({ queryKey: ['queueStats'] });
      queryClient.invalidateQueries({ queryKey: ['unassignedCounts'] });
      queryClient.invalidateQueries({ queryKey: ['recentOrders'] });
    }
  };
}
