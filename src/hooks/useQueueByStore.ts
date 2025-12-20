import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueue } from '../lib/rpc-client';
import type { Store } from '../types/db';

// Auto-refresh interval (60 seconds - matches existing QueueTable behavior)
const QUEUE_REFETCH_INTERVAL = 60_000;

// Stale time (30 seconds - data considered fresh for this duration)
const QUEUE_STALE_TIME = 30_000;

/**
 * Hook for fetching queue data by store
 *
 * Features:
 * - React Query cache management
 * - Auto-refresh every 60 seconds
 * - Refetch on window focus
 * - Supports storage filter
 * - Integrated with cache invalidation system
 */
export function useQueueByStore(
  store: Store,
  options?: {
    storage?: string | null;
    limit?: number;
    enabled?: boolean;
  }
) {
  const { storage = null, limit = 200, enabled = true } = options || {};

  return useQuery({
    queryKey: ['queue', store, { storage }],
    queryFn: () =>
      getQueue({
        store,
        storage,
        limit,
      }),
    staleTime: QUEUE_STALE_TIME,
    refetchInterval: QUEUE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for fetching queue data for monitor pages (weekly view)
 * Uses higher limit and sorts by due_date for calendar display
 */
export function useQueueForMonitor(
  store: Store,
  options?: {
    enabled?: boolean;
  }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: ['queue', store, 'monitor'],
    queryFn: () =>
      getQueue({
        store,
        limit: 5000,
        sort_by: 'due_date',
        sort_order: 'ASC',
      }),
    staleTime: QUEUE_STALE_TIME,
    refetchInterval: QUEUE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook to manually invalidate and refetch queue data
 * Use after mutations when you need immediate refresh
 */
export function useInvalidateQueueByStore() {
  const queryClient = useQueryClient();

  return async (store?: Store) => {
    if (store) {
      await queryClient.invalidateQueries({ queryKey: ['queue', store] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['queue'] });
    }
  };
}
