import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount } from '../lib/rpc-client';
import { useRealtimeMessages } from './useRealtimeMessages';

/**
 * Hook to track unread message count with realtime updates.
 * Fetches initial count on mount and subscribes to new messages.
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced fetch to avoid hammering the RPC on rapid message updates
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchCount();
    }, 500);
  }, [fetchCount]);

  // Subscribe to realtime message updates
  useRealtimeMessages({
    conversationId: null,
    onNewMessage: () => {
      debouncedFetch();
    },
  });

  // Fetch on mount
  useEffect(() => {
    fetchCount();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchCount]);

  return { unreadCount, isLoading, refetch: fetchCount };
}
