import { useQuery, skipToken } from '@tanstack/react-query';
import { getOrderV2, getOrder, type OrderV2Result, type LegacyOrderResult } from '../lib/rpc-client';
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
 * Convert legacy order result to V2 format
 * LegacyOrderResult shares all base fields with OrderV2Result,
 * so we only need to add the missing V2-specific fields as null
 */
function legacyToV2Order(legacy: LegacyOrderResult): OrderV2Result {
  return {
    ...legacy,
    shipping_address: null,
    accessories: null,
  };
}

/**
 * Fetches order with fallback from getOrderV2 to getOrder
 * getOrderV2 includes shipping_address, getOrder is the legacy fallback
 */
async function fetchOrderWithFallback(orderId: string, store: Store): Promise<OrderV2Result | null> {
  try {
    return await getOrderV2(orderId, store);
  } catch (err: unknown) {
    // Fallback to getOrder if getOrderV2 RPC doesn't exist (PostgreSQL error 42883)
    // Only check for the specific error code to avoid false positives
    const isRpcNotFound =
      err && typeof err === 'object' && 'code' in err && err.code === '42883';

    if (isRpcNotFound) {
      console.warn('getOrderV2 RPC not available, falling back to getOrder');
      const legacyOrder = await getOrder(orderId, store);
      // Convert legacy order to V2 format with null for V2-specific fields
      return legacyOrder ? legacyToV2Order(legacyOrder) : null;
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
