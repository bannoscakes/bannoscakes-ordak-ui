// hooks/useRealtimeMessageHandler.ts
import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import {
  toId,
  CURRENT_USER_SENTINEL,
  type UIMessage as Message,
  type UIConversation as Conversation,
  type DisplayMessage,
} from '../lib/messaging-adapters';
import type { RealtimeMessageRow } from '../lib/messaging-types';

interface UseRealtimeMessageHandlerOptions {
  /** Ref to the currently selected conversation ID (avoids stale closure) */
  selectedConversationRef: MutableRefObject<string | null>;
  /** Current user's ID for determining own messages */
  currentUserId: string | undefined;
  /** State setter for messages */
  setMessages: Dispatch<SetStateAction<DisplayMessage[]>>;
  /** State setter for conversations */
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  /** Function to mark messages as read */
  markAsRead: (conversationId: string) => Promise<void>;
  /** Function to reload conversations in background */
  loadConversations: (opts?: { background?: boolean }) => Promise<void>;
  /** Function to reload unread count in background */
  loadUnreadCount: (opts?: { background?: boolean }) => Promise<void>;
}

/**
 * Creates a memoized handler for realtime message events.
 *
 * Uses selectedConversationRef instead of selectedConversation state to avoid
 * stale closure issues - the ref always contains the current value when the
 * callback is invoked by realtime events.
 */
export function useRealtimeMessageHandler({
  selectedConversationRef,
  currentUserId,
  setMessages,
  setConversations,
  markAsRead,
  loadConversations,
  loadUnreadCount,
}: UseRealtimeMessageHandlerOptions) {
  return useCallback((row: RealtimeMessageRow) => {
    // Read from ref to get current value, not stale closure
    const currentSelectedConv = selectedConversationRef.current;

    const uiMsg: Message = {
      id: toId(row.id),
      text: row.body ?? '',
      timestamp: row.created_at,
      senderId: row.sender_id === currentUserId ? CURRENT_USER_SENTINEL : toId(row.sender_id),
      senderName: row.sender_name || 'Unknown',
      read: row.sender_id === currentUserId,
    };

    // Only add to UI if viewing this conversation
    if (currentSelectedConv && currentSelectedConv === toId(row.conversation_id)) {
      setMessages((prev) => {
        // Dedupe by ID
        if (prev.some((m) => m.id === uiMsg.id)) return prev;
        // Add and sort by timestamp
        return [...prev, uiMsg].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      markAsRead(currentSelectedConv).catch(console.error);
      setConversations((prev) =>
        prev.map((c) => (c.id === currentSelectedConv ? { ...c, unreadCount: 0 } : c))
      );
    }

    // Background updates for conversation list
    loadConversations({ background: true });
    loadUnreadCount({ background: true });
  }, [currentUserId, markAsRead, loadConversations, loadUnreadCount, selectedConversationRef, setMessages, setConversations]);
}
