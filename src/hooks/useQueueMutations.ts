import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assignStaff,
  assignStaffBulk,
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
 * Invalidates all queue-related queries after a mutation to ensure UI consistency
 *
 * Invalidated query keys:
 * - `staffQueue` - Staff workspace queue
 * - `supervisorQueue` - Supervisor workspace queue
 * - `queueStats` - Dashboard statistics
 * - `unassignedCounts` - Unassigned order counts
 * - `recentOrders` - Recent orders list
 * - `queue` - Generic queue queries (QueueTable, etc.)
 *
 * @param queryClient - React Query client instance
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

/**
 * Hook to assign a staff member to an order
 *
 * @returns Mutation object with `mutate({ orderId, store, staffId })` function
 *
 * @example
 * const { mutate: assign } = useAssignStaff();
 * assign({ orderId: '123', store: 'bannos', staffId: 'user-456' });
 *
 * @sideeffect Invalidates all queue queries on success (staffQueue, supervisorQueue, queueStats, etc.)
 */
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

/**
 * Hook to unassign a staff member from an order
 *
 * @returns Mutation object with `mutate({ orderId, store })` function
 *
 * @example
 * const { mutate: unassign } = useUnassignStaff();
 * unassign({ orderId: '123', store: 'bannos' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to bulk assign a staff member to multiple orders in a single atomic transaction
 *
 * @returns Mutation object with `mutate({ orderIds, store, staffId })` function.
 *          The mutation's `data` property will contain `{ successCount, failCount, total }` on success.
 *
 * @example
 * const { mutate: bulkAssign } = useBulkAssignStaff();
 * bulkAssign({ orderIds: ['123', '456'], store: 'bannos', staffId: 'user-789' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
export function useBulkAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, store, staffId }: { orderIds: string[]; store: Store; staffId: string }) => {
      // Single RPC call for all orders (atomic transaction)
      const successCount = await assignStaffBulk(orderIds, store, staffId);
      const failCount = orderIds.length - successCount;

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

/**
 * Hook to set the storage location for an order
 *
 * @returns Mutation object with `mutate({ orderId, store, storageLocation })` function
 *
 * @example
 * const { mutate: setStorage } = useSetStorage();
 * setStorage({ orderId: '123', store: 'bannos', storageLocation: 'Fridge A' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to update the priority level of an order
 *
 * @returns Mutation object with `mutate({ orderId, store, priority })` function
 *
 * @example
 * const { mutate: updatePriority } = useUpdateOrderPriority();
 * updatePriority({ orderId: '123', store: 'bannos', priority: 'High' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to mark the Filling stage as complete and advance order to Covering
 *
 * @returns Mutation object with `mutate({ orderId, store, notes? })` function
 *
 * @example
 * const { mutate: complete } = useCompleteFilling();
 * complete({ orderId: '123', store: 'bannos', notes: 'Used vanilla sponge' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to start the Covering stage for an order
 *
 * @returns Mutation object with `mutate({ orderId, store })` function
 *
 * @example
 * const { mutate: start } = useStartCovering();
 * start({ orderId: '123', store: 'bannos' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to mark the Covering stage as complete and advance order to Decorating
 *
 * @returns Mutation object with `mutate({ orderId, store, notes? })` function
 *
 * @example
 * const { mutate: complete } = useCompleteCovering();
 * complete({ orderId: '123', store: 'bannos', notes: 'White fondant' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to start the Decorating stage for an order
 *
 * @returns Mutation object with `mutate({ orderId, store })` function
 *
 * @example
 * const { mutate: start } = useStartDecorating();
 * start({ orderId: '123', store: 'bannos' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to mark the Decorating stage as complete and advance order to Packing
 *
 * @returns Mutation object with `mutate({ orderId, store, notes? })` function
 *
 * @example
 * const { mutate: complete } = useCompleteDecorating();
 * complete({ orderId: '123', store: 'bannos', notes: 'Added gold leaf accents' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to mark the Packing stage as complete and finalize the order
 *
 * @returns Mutation object with `mutate({ orderId, store, notes? })` function
 *
 * @example
 * const { mutate: complete } = useCompletePacking();
 * complete({ orderId: '123', store: 'bannos', notes: 'Packed in large box' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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

/**
 * Hook to return an order from QC back to the Decorating stage
 *
 * Used when quality control identifies issues that need to be fixed.
 *
 * @returns Mutation object with `mutate({ orderId, store, notes? })` function
 *
 * @example
 * const { mutate: returnToDecorating } = useQcReturnToDecorating();
 * returnToDecorating({ orderId: '123', store: 'bannos', notes: 'Icing needs touch-up' });
 *
 * @sideeffect Invalidates all queue queries on success
 */
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
 * Hook that provides all stage progression mutations in a single object
 *
 * Useful for components like ScannerOverlay that need to handle multiple stages
 * and want a single hook to access all stage mutations.
 *
 * @returns Object containing all stage mutation hooks and an `isPending` flag
 *
 * @example
 * const { completeFilling, startCovering, isPending } = useStageMutations();
 *
 * if (isPending) {
 *   return <Spinner />;
 * }
 *
 * completeFilling.mutate({ orderId, store });
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
