// hooks/useRealtimeMessages.ts
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useErrorNotifications } from '../lib/error-notifications';
import type { RealtimeMessageRow } from '../lib/messaging-types';

interface UseRealtimeMessagesProps {
  conversationId: string | null; // kept for compatibility; see note in alt version
  onNewMessage: (message: RealtimeMessageRow) => void;
  onConversationUpdate?: (conversation: any, action: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

export const useRealtimeMessages = ({
  conversationId, // not used by default in the "all messages" subscription
  onNewMessage,
  onConversationUpdate
}: UseRealtimeMessagesProps) => {
  const { showError } = useErrorNotifications();

  // Keep the latest callbacks without resubscribing
  const latestOnNewMessage = useRef(onNewMessage);
  const latestOnConversationUpdate = useRef(onConversationUpdate);
  useEffect(() => { latestOnNewMessage.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { latestOnConversationUpdate.current = onConversationUpdate; }, [onConversationUpdate]);

  // Track both channels so we can cleanly remove them
  const messageChannelRef = useRef<any>(null);
  const conversationsChannelRef = useRef<any>(null);

  // Reactive connection state (messages channel as the primary signal)
  const [isConnected, setIsConnected] = useState(false);

  // 1) Messages channel — subscribe once to all INSERTs
  useEffect(() => {
    const supabase = getSupabase();

    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }

    const channel = supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // If you want only the selected conversation, see alt version:
          // filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined
        },
        (payload) => {
          latestOnNewMessage.current?.(payload.new as RealtimeMessageRow);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setIsConnected(false);
      });

    messageChannelRef.current = channel;

    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
    // Mount once; callbacks updated via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Conversations channel — subscribe once if a handler is provided
  useEffect(() => {
    if (!latestOnConversationUpdate.current) return;

    const supabase = getSupabase();

    if (conversationsChannelRef.current) {
      supabase.removeChannel(conversationsChannelRef.current);
      conversationsChannelRef.current = null;
    }

    const channel = supabase
      .channel('conversations:all')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          const action = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const row = action === 'DELETE' ? payload.old : payload.new;
          latestOnConversationUpdate.current?.(row, action);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          showError(new Error('Failed to connect to conversation updates'), {
            title: 'Connection Error',
            showRecoveryActions: true,
          });
        }
      });

    conversationsChannelRef.current = channel;

    return () => {
      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
    };
    // Mount once; handler ref keeps it fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  return { isConnected };
};