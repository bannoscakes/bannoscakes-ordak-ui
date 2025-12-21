import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCakeToppers } from '../lib/rpc-client';

/**
 * Query key factory for inventory queries
 * Centralizes key management for consistent invalidation
 */
export const inventoryKeys = {
  all: () => ['inventory'] as const,
  cakeToppersAll: () => [...inventoryKeys.all(), 'cakeToppers'] as const,
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
    // Uses global staleTime (30s) from query-client.ts
  });
}

/**
 * Hook to invalidate inventory queries after mutations
 * Returns functions to invalidate specific or all inventory caches
 * Uses refetchType: 'active' to immediately refetch visible queries
 */
export function useInvalidateInventory() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all cake topper queries */
    cakeToppersAll: () =>
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.cakeToppersAll(),
        refetchType: 'active',
      }),

    /** Invalidate all inventory queries */
    all: () =>
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.all(),
        refetchType: 'active',
      }),
  };
}
