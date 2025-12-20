import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assignStaff,
  unassignStaff,
  setStorage,
  updateOrderPriority,
  completeFilling,
  completeCovering,
  completeDecorating,
  completePacking,
  startCovering,
  startDecorating,
  qcReturnToDecorating,
} from '../lib/rpc-client';
import type { Store } from '../types/db';

/**
 * Invalidate all queue-related queries after a mutation
 * This ensures all views update consistently
 */
function invalidateAllQueueQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Invalidate staff/supervisor workspace queues
  queryClient.invalidateQueries({ queryKey: ['staffQueue'] });
  queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });

  // Invalidate dashboard queries
  queryClient.invalidateQueries({ queryKey: ['queueStats'] });
  queryClient.invalidateQueries({ queryKey: ['unassignedCounts'] });
  queryClient.invalidateQueries({ queryKey: ['recentOrders'] });

  // Invalidate any queue-prefixed queries (used by QueueTable, etc.)
  queryClient.invalidateQueries({ queryKey: ['queue'] });
}

// =============================================
// ASSIGNMENT MUTATIONS
// =============================================

export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, staffId }: { orderId: string; store: Store; staffId: string }) =>
      assignStaff(orderId, store, staffId),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useUnassignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store }: { orderId: string; store: Store }) =>
      unassignStaff(orderId, store),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useBulkAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, store, staffId }: { orderIds: string[]; store: Store; staffId: string }) => {
      const results = await Promise.allSettled(
        orderIds.map(orderId => assignStaff(orderId, store, staffId))
      );

      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = failures.length;

      // Log failure reasons for debugging
      if (failures.length > 0) {
        console.error('Bulk assignment failures:', failures.map(f => f.reason));
      }

      return { successCount, failCount, total: orderIds.length };
    },
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

// =============================================
// ORDER UPDATE MUTATIONS
// =============================================

export function useSetStorage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, storageLocation }: { orderId: string; store: Store; storageLocation: string }) =>
      setStorage(orderId, store, storageLocation),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useUpdateOrderPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, priority }: { orderId: string; store: Store; priority: 'High' | 'Medium' | 'Low' }) =>
      updateOrderPriority(orderId, store, priority),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

// =============================================
// STAGE PROGRESSION MUTATIONS
// =============================================

export function useCompleteFilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, notes }: { orderId: string; store: Store; notes?: string }) =>
      completeFilling(orderId, store, notes),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useStartCovering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store }: { orderId: string; store: Store }) =>
      startCovering(orderId, store),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useCompleteCovering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, notes }: { orderId: string; store: Store; notes?: string }) =>
      completeCovering(orderId, store, notes),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useStartDecorating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store }: { orderId: string; store: Store }) =>
      startDecorating(orderId, store),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useCompleteDecorating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, notes }: { orderId: string; store: Store; notes?: string }) =>
      completeDecorating(orderId, store, notes),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

export function useCompletePacking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, notes }: { orderId: string; store: Store; notes?: string }) =>
      completePacking(orderId, store, notes),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

// =============================================
// QC MUTATIONS
// =============================================

export function useQcReturnToDecorating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, store, notes }: { orderId: string; store: Store; notes?: string }) =>
      qcReturnToDecorating(orderId, store, notes),
    onSuccess: () => {
      invalidateAllQueueQueries(queryClient);
    },
  });
}

// =============================================
// COMPOSITE HOOKS
// =============================================

/**
 * Hook that provides all stage progression mutations
 * Useful for ScannerOverlay which needs to handle different stages
 */
export function useStageMutations() {
  const completeFilling = useCompleteFilling();
  const startCovering = useStartCovering();
  const completeCovering = useCompleteCovering();
  const startDecorating = useStartDecorating();
  const completeDecorating = useCompleteDecorating();
  const completePacking = useCompletePacking();

  return {
    completeFilling,
    startCovering,
    completeCovering,
    startDecorating,
    completeDecorating,
    completePacking,
    // Helper to check if any mutation is pending
    isPending:
      completeFilling.isPending ||
      startCovering.isPending ||
      completeCovering.isPending ||
      startDecorating.isPending ||
      completeDecorating.isPending ||
      completePacking.isPending,
  };
}
