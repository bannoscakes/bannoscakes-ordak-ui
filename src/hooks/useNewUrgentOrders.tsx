import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

// Context type
interface NewUrgentOrdersContextType {
  newUrgentIds: Set<string>;
  markAsSeen: (orderId: string) => void;
  clearAll: () => void;
}

// Create context
const NewUrgentOrdersContext = createContext<NewUrgentOrdersContextType | null>(null);

/**
 * Internal hook for real-time new urgent order tracking via Supabase Realtime.
 *
 * Subscribes to INSERT events on both stores' order tables and tracks orders
 * with priority='High' in session-only state. Also invalidates React Query
 * cache when new urgent orders arrive.
 *
 * Note: This hook is used internally by NewUrgentOrdersProvider.
 * Components should use useNewUrgentOrders() instead.
 */
function useRealtimeNewUrgentOrders(
  newUrgentIds: Set<string>,
  setNewUrgentIds: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    const stores = ['bannos', 'flourlane'] as const;

    // Clean up existing channels
    channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    channelsRef.current = [];

    stores.forEach(store => {
      const channel = supabase
        .channel(`new-urgent-${store}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: `orders_${store}`,
          },
          (payload: RealtimePostgresChangesPayload<{
            id: string | number;
            priority?: 'High' | 'Medium' | 'Low' | null;
          }>) => {
            const newOrder = payload.new;

            // Type guard - ensure we have a valid order
            if (!newOrder || typeof newOrder !== 'object' || !('id' in newOrder) || !newOrder.id) {
              return;
            }

            // Only track if priority is High
            if (newOrder.priority === 'High') {
              const compositeId = `${store}:${String(newOrder.id)}`;
              setNewUrgentIds(prev => {
                const next = new Set(prev);
                next.add(compositeId);
                return next;
              });

              // Invalidate React Query caches so order data loads
              queryClient.invalidateQueries({ queryKey: ['queue', store] });
              queryClient.invalidateQueries({ queryKey: ['queueByStore', store] });
              queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: `orders_${store}`,
          },
          (payload: RealtimePostgresChangesPayload<{
            id: string | number;
            priority?: 'High' | 'Medium' | 'Low' | null;
          }>) => {
            const updatedOrder = payload.new;

            // Type guard
            if (!updatedOrder || typeof updatedOrder !== 'object' || !('id' in updatedOrder) || !updatedOrder.id) {
              return;
            }

            const compositeId = `${store}:${String(updatedOrder.id)}`;

            // Add to list if priority changed TO High (e.g., due date edited)
            if (!newUrgentIds.has(compositeId) && updatedOrder.priority === 'High') {
              setNewUrgentIds(prev => {
                const next = new Set(prev);
                next.add(compositeId);
                return next;
              });

              // Invalidate queries so order data loads
              queryClient.invalidateQueries({ queryKey: ['queue', store] });
              queryClient.invalidateQueries({ queryKey: ['queueByStore', store] });
              queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });
            }

            // Remove from list if priority changed FROM High (downgraded)
            if (newUrgentIds.has(compositeId) && updatedOrder.priority !== 'High') {
              setNewUrgentIds(prev => {
                const next = new Set(prev);
                next.delete(compositeId);
                return next;
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error(`New urgent orders subscription error (${store}):`, status);
          }
        });

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [queryClient, newUrgentIds, setNewUrgentIds]);
}

/**
 * Provider component for new urgent orders tracking.
 *
 * Manages a single realtime subscription for the entire app, avoiding duplicate
 * subscriptions when multiple components use useNewUrgentOrders(). State clears
 * on unmount (e.g., logout).
 *
 * Mount this once at app level:
 *
 * @example
 * <NewUrgentOrdersProvider>
 *   <Dashboard />
 * </NewUrgentOrdersProvider>
 */
export function NewUrgentOrdersProvider({ children }: { children: ReactNode }) {
  const [newUrgentIds, setNewUrgentIds] = useState<Set<string>>(new Set());

  // Single realtime subscription for the entire app
  useRealtimeNewUrgentOrders(newUrgentIds, setNewUrgentIds);

  const markAsSeen = (orderId: string) => {
    setNewUrgentIds(prev => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  const clearAll = () => {
    setNewUrgentIds(new Set());
  };

  return (
    <NewUrgentOrdersContext.Provider value={{ newUrgentIds, markAsSeen, clearAll }}>
      {children}
    </NewUrgentOrdersContext.Provider>
  );
}

/**
 * Hook to access new urgent orders state.
 *
 * Tracks new urgent orders (priority='High') that arrive during the current session.
 * State persists across component remounts but clears on app unmount (logout).
 *
 * Note: Realtime subscription is managed by NewUrgentOrdersProvider at the app level.
 * This prevents duplicate subscriptions when multiple components use this hook.
 *
 * @returns Object with Set of new urgent order IDs and helper functions
 *
 * @example
 * const { newUrgentIds, markAsSeen, clearAll } = useNewUrgentOrders();
 * const hasNewUrgent = newUrgentIds.has(`bannos:${orderId}`);
 */
export function useNewUrgentOrders() {
  const context = useContext(NewUrgentOrdersContext);

  if (!context) {
    throw new Error('useNewUrgentOrders must be used within NewUrgentOrdersProvider');
  }

  return context;
}
