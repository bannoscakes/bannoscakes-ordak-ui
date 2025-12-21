import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCakeToppers,
  getAccessories,
  getAccessoriesNeedingSync,
} from '../lib/rpc-client';

/**
 * Query key factory for inventory queries
 * Centralizes key management for consistent invalidation
 */
export const inventoryKeys = {
  all: () => ['inventory'] as const,
  // Cake Toppers
  cakeToppersAll: () => [...inventoryKeys.all(), 'cakeToppers'] as const,
  cakeToppersFiltered: (activeOnly: boolean) =>
    [...inventoryKeys.cakeToppersAll(), { activeOnly }] as const,
  // Accessories
  accessoriesAll: () => [...inventoryKeys.all(), 'accessories'] as const,
  accessoriesFiltered: (category?: string) =>
    [...inventoryKeys.accessoriesAll(), { category }] as const,
  accessoriesNeedingSync: () => [...inventoryKeys.accessoriesAll(), 'needingSync'] as const,
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
 * Hook for accessories list
 * Used by: AccessoriesTab
 */
export function useAccessories(options?: { category?: string }) {
  return useQuery({
    queryKey: inventoryKeys.accessoriesFiltered(options?.category),
    queryFn: () => getAccessories({ category: options?.category }),
    // Uses global staleTime (30s) from query-client.ts
  });
}

/**
 * Hook for accessories needing Shopify sync (out of stock)
 * Used by: AccessoriesTab sync alert
 */
export function useAccessoriesNeedingSync() {
  return useQuery({
    queryKey: inventoryKeys.accessoriesNeedingSync(),
    queryFn: () => getAccessoriesNeedingSync(),
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

    /** Invalidate all accessory queries (including needingSync) */
    accessoriesAll: () =>
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.accessoriesAll(),
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
