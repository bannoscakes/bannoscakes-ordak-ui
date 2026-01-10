import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { playNotificationSound, resumeAudioContext } from '@/lib/notificationSound';
import type { QueueItem } from '@/types/queue';

const NOTIFIED_ORDERS_KEY = 'notified-high-priority-orders';
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const MAX_STORED_IDS = 500; // Limit localStorage to 500 most recent IDs

/**
 * Hook for monitoring and notifying about high-priority orders.
 *
 * Features:
 * - Monitors React Query cache for orders with priority='High'
 * - Tracks notified order IDs in localStorage to avoid duplicate notifications (max 500 IDs)
 * - Multi-layered notifications for bakery environment (belt and suspenders):
 *   1. Audible alert: 3-beep pattern (400Hz-600Hz-400Hz) at 60% volume
 *   2. Visual toast: Red error toast at top-center for 15 seconds
 *   3. Tactile feedback: Vibration pattern on mobile devices
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

    // Save notified orders to localStorage (limited to MAX_STORED_IDS most recent)
    const saveNotifiedOrders = (orderIds: Set<string>) => {
      try {
        const idsArray = [...orderIds];
        // Keep only the most recent MAX_STORED_IDS to prevent unbounded growth
        const limitedIds = idsArray.slice(-MAX_STORED_IDS);
        localStorage.setItem(NOTIFIED_ORDERS_KEY, JSON.stringify(limitedIds));
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
      // Check Admin first (highest privilege), then Supervisor, then Staff
      let queryKeys: unknown[][] = [];
      if (hasRole('Admin')) {
        // Admin sees both stores - use partial key to match any storage filter
        queryKeys = [
          ['queue', 'bannos'],
          ['queue', 'flourlane'],
        ];
      } else if (hasRole('Supervisor')) {
        queryKeys = [['supervisorQueue', user?.id]];
      } else if (hasRole('Staff')) {
        queryKeys = [['staffQueue', user?.id]];
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

      // If new high-priority orders found, notify user with multiple methods (belt and suspenders)
      if (newHighPriorityOrders.length > 0) {
        // 1. Play notification sound for new urgent orders
        playNotificationSound();

        // 2. Show visual toast notification (more visible than warning)
        const count = newHighPriorityOrders.length;
        const message =
          count === 1
            ? `🚨 New urgent order: ${newHighPriorityOrders[0].orderNumber}`
            : `🚨 ${count} new urgent orders require attention`;

        toast.error(message, {
          duration: 15000, // Show for 15 seconds
          position: 'top-center',
        });

        // 3. Vibrate on mobile devices (if supported)
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]); // Short-pause-short pattern
          } catch (error) {
            console.warn('Vibration failed:', error);
          }
        }

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
