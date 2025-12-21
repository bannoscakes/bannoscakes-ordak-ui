import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCakeToppers } from '../lib/rpc-client';

// Stale time for inventory data (30 seconds)
const INVENTORY_STALE_TIME = 30_000;

/**
 * Query key factory for inventory queries
 * Centralizes key management for consistent invalidation
 */
export const inventoryKeys = {
  all: ['inventory'] as const,
  cakeToppersAll: () => [...inventoryKeys.all, 'cakeToppers'] as const,
  cakeToppersFiltered: (activeOnly: boolean) =>
    [...inventoryKeys.cakeToppersAll(), { activeOnly }] as const,
};

/**
 * Hook for cake toppers list
 * Used by: CakeToppersTab
 */
export function useCakeToppers(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? true;

  return useQuery({
    queryKey: inventoryKeys.cakeToppersFiltered(activeOnly),
    queryFn: () => getCakeToppers({ activeOnly }),
    staleTime: INVENTORY_STALE_TIME,
  });
}

/**
 * Hook to invalidate inventory queries after mutations
 * Returns functions to invalidate specific or all inventory caches
 */
export function useInvalidateInventory() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all cake topper queries */
    cakeToppersAll: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.cakeToppersAll() }),

    /** Invalidate all inventory queries */
    all: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  };
}
