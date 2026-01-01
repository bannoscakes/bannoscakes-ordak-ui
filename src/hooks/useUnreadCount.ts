import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadCount } from '../lib/rpc-client';
import { getSupabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Query key for unread message count */
export const UNREAD_COUNT_QUERY_KEY = ['unreadCount'] as const;

/** Polling interval for unread count (30 seconds - realtime handles immediate updates) */
const UNREAD_COUNT_REFETCH_INTERVAL = 30000;

/**
 * TanStack Query hook for fetching unread message count.
 *
 * @returns Query result with unread count data, loading state, and error state
 *
 * @example
 * const { data: count, isLoading, error } = useUnreadCountQuery();
 */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const count = await getUnreadCount();
      return count;
    },
    staleTime: UNREAD_COUNT_REFETCH_INTERVAL,
    refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL,
    // Polling pauses when tab is hidden (saves RPC calls)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for real-time unread count updates via Supabase Realtime.
 *
 * Subscribes to INSERT events on the messages table and changes on
 * message_reads table. When changes occur, invalidates React Query
 * cache to trigger a refetch.
 *
 * @param options - Optional configuration
 * @param options.enabled - Whether the subscription is active (default: true)
 */
export function useRealtimeUnreadCount(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel for unread count updates
    const channelName = `unread-count-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // New message inserted - invalidate unread count query
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reads',
        },
        () => {
          // Message read status changed - invalidate unread count query
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Unread count realtime subscription error:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, queryClient]);
}

/**
 * Combined hook for unread message count with real-time updates.
 *
 * Uses TanStack Query for data fetching/caching and Supabase Realtime
 * for live updates. Polls every 5 seconds as a fallback.
 *
 * @returns Object with unreadCount, isLoading, error, and refetch function
 *
 * @example
 * const { unreadCount, isLoading } = useUnreadCount();
 *
 * if (unreadCount > 0) {
 *   return <Badge>{unreadCount}</Badge>;
 * }
 */
export function useUnreadCount() {
  const { data: unreadCount = 0, isLoading, error, refetch } = useUnreadCountQuery();

  // Subscribe to realtime updates
  useRealtimeUnreadCount();

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
  };
}
