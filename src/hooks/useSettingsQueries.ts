import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getStorageLocations, getFlavours, getStaffList, type StaffMember } from '../lib/rpc-client';
import type { Store } from '../types/db';

/**
 * Query key factory for settings queries
 * Centralizes key management for consistent invalidation
 */
export const settingsKeys = {
  all: () => ['settings'] as const,
  storageLocations: (store: Store | undefined) =>
    [...settingsKeys.all(), 'storageLocations', store ?? 'none'] as const,
  flavours: (store: Store | undefined) =>
    [...settingsKeys.all(), 'flavours', store ?? 'none'] as const,
  staffList: (role: string | null, isActive: boolean) =>
    [...settingsKeys.all(), 'staffList', role ?? 'all', isActive] as const,
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
 * TODO: Will be used by EditOrderDrawer and CreateManualOrderModal
 *
 * Settings change rarely, so we use a longer staleTime (5 minutes)
 * Uses skipToken pattern for type-safe conditional fetching
 */
export function useFlavours(store: Store | undefined) {
  return useQuery({
    queryKey: settingsKeys.flavours(store),
    queryFn: store ? () => getFlavours(store) : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings change rarely
  });
}

/**
 * Options for useStaffList hook
 */
interface UseStaffListOptions {
  role?: string | null;
  isActive?: boolean;
  store?: Store;
}

/**
 * Hook for staff list with optional filtering
 * Used by: QueueTable (bulk assignment), StaffAssignmentModal, StaffPage, StaffAnalyticsPage
 *
 * Staff list changes rarely, so we use a longer staleTime (5 minutes)
 * Supports optional client-side store filtering (RPC doesn't filter by store)
 */
export function useStaffList(options: UseStaffListOptions = {}) {
  const { role = null, isActive = true, store } = options;

  const query = useQuery({
    queryKey: settingsKeys.staffList(role, isActive),
    queryFn: () => getStaffList(role, isActive),
    staleTime: 5 * 60 * 1000, // 5 minutes - staff list changes rarely
  });

  // Client-side store filtering (staff can work at 'both' stores)
  const filteredData = useMemo(() => {
    if (!query.data || !store) return query.data;
    return query.data.filter(
      (staff: StaffMember) => staff.store === 'both' || staff.store === store
    );
  }, [query.data, store]);

  return {
    ...query,
    data: filteredData,
  };
}

/**
 * Hook to invalidate settings queries after mutations
 * Used by: SettingsPage after saving storage locations or flavours
 */
export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: settingsKeys.all() });
  }, [queryClient]);
}
