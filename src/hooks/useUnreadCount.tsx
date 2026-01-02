import { useEffect, useRef, type ReactNode } from 'react';
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
 * Note: This hook is used internally by UnreadCountSubscriptionProvider.
 * Components should use useUnreadCount() instead.
 */
function useRealtimeUnreadCount() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Static channel name for easier debugging and single subscription management
    const channelName = 'unread-count-realtime';
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
          // Log error for debugging - not surfaced to UI because:
          // 1. Realtime errors are often transient (network blips)
          // 2. Polling fallback (every 30s) ensures users still get updates
          // 3. Toast spam would be annoying for background features
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
  }, [queryClient]);
}

/**
 * Combined hook for unread message count with real-time updates.
 *
 * Uses TanStack Query for data fetching/caching. Real-time updates are
 * handled by the UnreadCountSubscriptionProvider at the app level.
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

  // Note: Realtime subscription is managed by UnreadCountSubscriptionProvider
  // which is mounted once at the app level (fixes duplicate subscription issue #594)

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Provider component that manages a single realtime subscription for unread count.
 *
 * Mount this once at the app level (after authentication) to share a single
 * subscription across all components that use useUnreadCount().
 *
 * @example
 * // In App.tsx, wrap authenticated content:
 * <UnreadCountSubscriptionProvider>
 *   <Dashboard />
 * </UnreadCountSubscriptionProvider>
 */
export function UnreadCountSubscriptionProvider({ children }: { children: ReactNode }) {
  // Single realtime subscription for the entire app
  // This provider ensures only one subscription exists, avoiding duplicates
  // when multiple components call useUnreadCount()
  useRealtimeUnreadCount();

  return <>{children}</>;
}
