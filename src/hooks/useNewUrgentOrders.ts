import { useEffect, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

// Module-level state (survives component remounts but clears on page refresh)
const newUrgentOrderIds = new Set<string>();

// Track subscribers to trigger re-renders
let subscribers: (() => void)[] = [];

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

export interface UseNewUrgentOrdersReturn {
  newUrgentIds: Set<string>;
  markAsSeen: (orderId: string) => void;
  clearAll: () => void;
}

/**
 * Hook to track new urgent orders (priority='High') that arrive during the current session.
 * State persists across component remounts but clears on page refresh.
 *
 * @returns Object with Set of new urgent order IDs and helper functions
 */
export function useNewUrgentOrders(): UseNewUrgentOrdersReturn {
  const [, setTrigger] = useState(0);

  useEffect(() => {
    // Register this component as a subscriber
    const forceUpdate = () => setTrigger(prev => prev + 1);
    subscribers.push(forceUpdate);

    const supabase = getSupabase();
    const channels: RealtimeChannel[] = [];

    // Subscribe to both stores
    const stores = ['bannos', 'flourlane'] as const;

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
              newUrgentOrderIds.add(compositeId);
              notifySubscribers();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error(`New urgent orders subscription error (${store}):`, status);
          }
        });

      channels.push(channel);
    });

    // Cleanup on unmount
    return () => {
      subscribers = subscribers.filter(cb => cb !== forceUpdate);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const markAsSeen = (orderId: string) => {
    newUrgentOrderIds.delete(orderId);
    notifySubscribers();
  };

  const clearAll = () => {
    newUrgentOrderIds.clear();
    notifySubscribers();
  };

  return {
    newUrgentIds: newUrgentOrderIds,
    markAsSeen,
    clearAll,
  };
}
