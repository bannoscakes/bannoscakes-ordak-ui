import { useQuery, skipToken } from '@tanstack/react-query';
import { getStorageLocations, getFlavours } from '../lib/rpc-client';
import type { Store } from '../types/db';

/**
 * Query key factory for settings queries
 * Centralizes key management for consistent invalidation
 */
export const settingsKeys = {
  all: () => ['settings'] as const,
  storageLocations: (store: Store | undefined) =>
    [...settingsKeys.all(), 'storageLocations', store ?? 'none'] as const,
  flavours: (store: Store) => [...settingsKeys.all(), 'flavours', store] as const,
};

/**
 * Hook for storage locations by store
 * Used by: QueueTable (filter dropdown), StaffOrderDetailDrawer (storage selector)
 *
 * Settings change rarely, so we use a longer staleTime (5 minutes)
 * Uses skipToken pattern for type-safe conditional fetching
 */
export function useStorageLocations(store: Store | undefined) {
  return useQuery({
    queryKey: settingsKeys.storageLocations(store),
    queryFn: store ? () => getStorageLocations(store) : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings change rarely
  });
}

/**
 * Hook for flavours by store
 * Used by: EditOrderDrawer, CreateOrderForm
 *
 * Settings change rarely, so we use a longer staleTime (5 minutes)
 */
export function useFlavours(store: Store) {
  return useQuery({
    queryKey: settingsKeys.flavours(store),
    queryFn: () => getFlavours(store),
    staleTime: 5 * 60 * 1000, // 5 minutes - settings change rarely
  });
}
