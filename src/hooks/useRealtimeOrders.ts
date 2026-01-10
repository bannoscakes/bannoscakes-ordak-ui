import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { getSupabase } from '../lib/supabase';
import type { Store } from '../types/db';
import { playNotificationSound } from '@/lib/notificationSound';

// Track notified orders to prevent duplicates from multiple hook instances
// Use Map to maintain insertion order for FIFO eviction when limit reached
const notifiedOrders = new Map<string, number>();
const MAX_NOTIFIED_ORDERS = 100; // Prevent unbounded growth

function trackNotifiedOrder(orderId: string): boolean {
  const now = Date.now();

  // Check if already notified recently
  if (notifiedOrders.has(orderId)) {
    return false; // Already notified
  }

  // Add new order
  notifiedOrders.set(orderId, now);

  // Enforce size limit using FIFO eviction
  if (notifiedOrders.size > MAX_NOTIFIED_ORDERS) {
    const firstKey = notifiedOrders.keys().next().value;
    if (firstKey) {
      notifiedOrders.delete(firstKey);
    }
  }

  // Clear after 10 seconds to allow re-notification if needed
  setTimeout(() => notifiedOrders.delete(orderId), 10000);

  return true; // Should notify
}

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
        (payload: RealtimePostgresChangesPayload<{
          id: string | number;
          shopify_order_number?: string | number | null;
          human_id?: string | null;
        }>) => {
          // Invalidate all queue-related queries for this store
          queryClient.invalidateQueries({ queryKey: ['queue', store] });
          queryClient.invalidateQueries({ queryKey: ['queueStats', store] });
          // Also invalidate user-specific queues (supervisor/staff see orders across stores)
          queryClient.invalidateQueries({ queryKey: ['supervisorQueue'] });
          queryClient.invalidateQueries({ queryKey: ['staffQueue'] });

          // Alert on new order
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;

            // Type guard - ensure we have a valid order ID
            if (!newOrder?.id) return;

            // Create store-scoped key to prevent cross-store collisions
            const orderId = `${store}:${String(newOrder.id)}`;

            // Track notification with bounded memory (prevents duplicates + enforces size limit)
            if (!trackNotifiedOrder(orderId)) return;

            playNotificationSound().catch(err => console.warn('Sound failed:', err));

            // Add store prefix for consistency (B for Bannos, F for Flourlane)
            const storePrefix = store === 'bannos' ? 'B' : 'F';
            // Prefer human_id, fallback to shopify_order_number, then id (avoid showing UUIDs)
            const orderNumber = newOrder.human_id || newOrder.shopify_order_number || newOrder.id;
            toast.success(`New order: #${storePrefix}${orderNumber}`, {
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
