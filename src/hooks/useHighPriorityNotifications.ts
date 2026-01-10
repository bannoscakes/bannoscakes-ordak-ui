import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { playNotificationSound, resumeAudioContext } from '@/lib/notificationSound';
import type { QueueItem } from '@/types/queue';

const NOTIFIED_ORDERS_KEY = 'notified-high-priority-orders';
const CHECK_INTERVAL = 5000; // Check every 5 seconds

/**
 * Hook for monitoring and notifying about high-priority orders.
 *
 * Features:
 * - Monitors React Query cache for orders with priority='High'
 * - Tracks notified order IDs in localStorage to avoid duplicate notifications
 * - Plays notification sound when new high-priority orders detected
 * - Only runs for Staff, Supervisor, and Admin roles
 *
 * The hook subscribes to query cache changes and performs periodic checks
 * to ensure notifications are not missed even if cache updates are delayed.
 *
 * Users can view urgent orders in the permanent "Urgent Orders" tab which
 * displays all high-priority orders with visual indicators.
 *
 * @example
 * // In StaffWorkspacePage or SupervisorWorkspacePage:
 * useHighPriorityNotifications();
 */
export function useHighPriorityNotifications() {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuthContext();
  const intervalRef = useRef<number | null>(null);
  const lastCheckRef = useRef<Set<string>>(new Set());

  // Only run for Staff, Supervisor, or Admin roles
  const enabled =
    !!user && (hasRole('Staff') || hasRole('Supervisor') || hasRole('Admin'));

  useEffect(() => {
    if (!enabled) return;

    // Resume audio context on user interaction (browser autoplay policy)
    const handleUserInteraction = () => {
      resumeAudioContext();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    // Load previously notified orders from localStorage
    const loadNotifiedOrders = (): Set<string> => {
      try {
        const stored = localStorage.getItem(NOTIFIED_ORDERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          return new Set(parsed);
        }
      } catch (error) {
        console.warn('Failed to load notified orders from localStorage:', error);
      }
      return new Set();
    };

    // Save notified orders to localStorage
    const saveNotifiedOrders = (orderIds: Set<string>) => {
      try {
        localStorage.setItem(NOTIFIED_ORDERS_KEY, JSON.stringify([...orderIds]));
      } catch (error) {
        console.warn('Failed to save notified orders to localStorage:', error);
      }
    };

    // Check for new high-priority orders
    const checkForHighPriorityOrders = () => {
      const notifiedOrders = loadNotifiedOrders();
      const currentHighPriorityOrders = new Set<string>();
      const newHighPriorityOrders: QueueItem[] = [];

      // Determine which query keys to check based on role
      let queryKeys: unknown[][] = [];
      if (hasRole('Staff')) {
        queryKeys = [['staffQueue', user?.id]];
      } else if (hasRole('Supervisor')) {
        queryKeys = [['supervisorQueue', user?.id]];
      } else if (hasRole('Admin')) {
        // Admin sees both stores - use partial key to match any storage filter
        queryKeys = [
          ['queue', 'bannos'],
          ['queue', 'flourlane'],
        ];
      }

      // Check each relevant query cache
      for (const queryKey of queryKeys) {
        // Use getQueriesData to get all matching queries (handles partial key matching)
        const queries = queryClient.getQueriesData<QueueItem[]>({ queryKey });

          for (const [, data] of queries) {
            if (!data) continue;

            // Filter for high-priority orders
            const highPriorityOrders = data.filter((order) => order.priority === 'High');

            for (const order of highPriorityOrders) {
              currentHighPriorityOrders.add(order.id);

              // Check if this is a new high-priority order
              if (!notifiedOrders.has(order.id) && !lastCheckRef.current.has(order.id)) {
                newHighPriorityOrders.push(order);
              }
            }
          }
        }

      // Update last check reference
      lastCheckRef.current = currentHighPriorityOrders;

      // If new high-priority orders found, notify user with sound
      if (newHighPriorityOrders.length > 0) {
        // Play notification sound for new urgent orders
        playNotificationSound();

        // Update localStorage with all current high-priority orders
        saveNotifiedOrders(currentHighPriorityOrders);
      }
    };

    // Subscribe to query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only react to successful query updates
      if (event?.type === 'updated' && event.action.type === 'success') {
        checkForHighPriorityOrders();
      }
    });

    // Also run periodic checks as fallback (in case cache updates are missed)
    intervalRef.current = window.setInterval(checkForHighPriorityOrders, CHECK_INTERVAL);

    // Initial check
    checkForHighPriorityOrders();

    return () => {
      unsubscribe();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [enabled, queryClient, user?.id, hasRole]);
}
