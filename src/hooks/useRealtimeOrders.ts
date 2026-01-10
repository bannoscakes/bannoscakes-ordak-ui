import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { getSupabase } from '../lib/supabase';
import type { Store } from '../types/db';
import { playNotificationSound } from '@/lib/notificationSound';

/**
 * Hook for real-time order updates via Supabase Realtime.
 *
 * Subscribes to INSERT, UPDATE, and DELETE events on the orders table
 * for the specified store. When changes occur, invalidates React Query
 * cache to trigger a refetch.
 *
 * @param store - The store to subscribe to ('bannos' or 'flourlane')
 * @param options - Optional configuration
 * @param options.enabled - Whether the subscription is active (default: true)
 */
export function useRealtimeOrders(
  store: Store,
  options?: {
    enabled?: boolean;
  }
) {
  const { enabled = true } = options || {};
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    const tableName = `orders_${store}`;

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Subscribe to all changes on the orders table
    const channel = supabase
      .channel(`orders-${store}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          // Invalidate all queue-related queries for this store
          queryClient.invalidateQueries({ queryKey: ['queue', store] });
          queryClient.invalidateQueries({ queryKey: ['queueStats', store] });
          // Also invalidate user-specific queues (supervisor/staff see orders across stores)
          queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });
          queryClient.invalidateQueries({ queryKey: ['staffQueue'] });

          // Alert on new order
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            playNotificationSound();
            toast.success(`New order: #${newOrder.shopify_order_number || newOrder.id}`, {
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Realtime subscription error:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [store, enabled, queryClient]);
}
