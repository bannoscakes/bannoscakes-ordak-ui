import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getOrderV2, getOrder, type OrderV2Result } from '../lib/rpc-client';
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
 * Fetches order with fallback from getOrderV2 to getOrder
 * getOrderV2 includes shipping_address, getOrder is the legacy fallback
 */
async function fetchOrderWithFallback(orderId: string, store: Store): Promise<OrderV2Result | null> {
  try {
    return await getOrderV2(orderId, store);
  } catch (err: unknown) {
    // Fallback to getOrder if getOrderV2 RPC doesn't exist (PostgreSQL error 42883)
    const errMessage = err instanceof Error ? err.message : '';
    const isRpcNotFound =
      (err && typeof err === 'object' && 'code' in err && err.code === '42883') ||
      (errMessage.includes('function') && errMessage.includes('does not exist'));

    if (isRpcNotFound) {
      console.warn('getOrderV2 RPC not available, falling back to getOrder', err);
      const legacyOrder = await getOrder(orderId, store);
      // Cast legacy order to OrderV2Result (shipping_address will be undefined)
      return legacyOrder as OrderV2Result | null;
    }
    // Rethrow other errors
    throw err;
  }
}

/**
 * Hook for fetching order detail (extended with shipping_address and accessories)
 * Used by: OrderDetailDrawer, StaffOrderDetailDrawer
 *
 * Uses staleTime: 0 to always fetch fresh data when drawer opens
 * Uses skipToken pattern for type-safe conditional fetching
 * Includes fallback from getOrderV2 to getOrder for backwards compatibility
 */
export function useOrderDetail(
  orderId: string | undefined,
  store: Store | undefined,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;

  return useQuery<OrderV2Result | null>({
    queryKey: orderKeys.detail(orderId, store),
    queryFn: orderId && store ? () => fetchOrderWithFallback(orderId, store) : skipToken,
    staleTime: 0, // Always fetch fresh when drawer opens
    enabled,
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
