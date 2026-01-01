import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount } from '../lib/rpc-client';
import { getSupabase } from '../lib/supabase';

/**
 * Hook to track unread message count with realtime updates.
 * Uses its own dedicated realtime channel to avoid conflicts.
 * Also polls every 30 seconds as a fallback.
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  const fetchCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchCount();

    const supabase = getSupabase();

    // Create a unique channel for unread count updates
    const channelName = `unread-count-${Math.random().toString(36).slice(2)}`;
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
          // New message inserted - refetch count
          fetchCount();
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
          // Message read status changed - refetch count
          fetchCount();
        }
      )
      .subscribe();

    channelRef.current = channel as typeof channelRef.current;

    // Polling fallback every 30 seconds
    const pollInterval = setInterval(() => {
      fetchCount();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchCount]);

  return { unreadCount, isLoading, refetch: fetchCount };
}
