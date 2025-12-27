import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getOrderV2, type OrderV2Result } from '../lib/rpc-client';
import type { Store } from '../types/db';

/**
 * Query key factory for order queries
 * Centralizes key management for consistent invalidation
 */
export const orderKeys = {
  all: () => ['orders'] as const,
  detail: (orderId: string | undefined, store: Store | undefined) =>
    [...orderKeys.all(), 'detail', orderId ?? 'none', store ?? 'none'] as const,
};

/**
 * Hook for fetching order detail (extended with shipping_address and accessories)
 * Used by: OrderDetailDrawer, StaffOrderDetailDrawer
 *
 * Uses staleTime: 0 to always fetch fresh data when drawer opens
 * Uses skipToken pattern for type-safe conditional fetching
 */
export function useOrderDetail(
  orderId: string | undefined,
  store: Store | undefined,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;

  return useQuery<OrderV2Result | null>({
    queryKey: orderKeys.detail(orderId, store),
    queryFn: orderId && store ? () => getOrderV2(orderId, store) : skipToken,
    staleTime: 0, // Always fetch fresh when drawer opens
    enabled: enabled && !!orderId && !!store,
  });
}

/**
 * Hook to invalidate order detail queries after mutations
 * Used by: Components that modify order data
 */
export function useInvalidateOrderDetail() {
  const queryClient = useQueryClient();
  return useCallback(
    (orderId?: string, store?: Store) => {
      if (orderId && store) {
        // Invalidate specific order
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId, store) });
      } else {
        // Invalidate all order details
        queryClient.invalidateQueries({ queryKey: orderKeys.all() });
      }
    },
    [queryClient]
  );
}
