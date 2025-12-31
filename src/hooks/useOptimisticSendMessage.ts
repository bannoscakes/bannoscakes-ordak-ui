// src/hooks/useOptimisticSendMessage.ts
import { useCallback, useEffect, useRef, type SetStateAction, type Dispatch } from "react";
import { v4 as uuid } from "uuid";

import { sendMessage } from "../lib/rpc-client";
import {
  CURRENT_USER_SENTINEL,
  isOptimisticUIMessage,
  type DisplayMessage,
  type OptimisticUIMessage,
} from "../lib/messaging-adapters";

export interface UseOptimisticSendMessageOptions {
  selectedConversation: string | null;
  currentUserId: string | undefined;
  setMessages: Dispatch<SetStateAction<DisplayMessage[]>>;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Hook for sending messages with optimistic UI updates.
 *
 * Handles:
 * - Optimistic message creation with clientId
 * - RPC call to send message
 * - Reconciliation of optimistic message with server response
 * - Error handling with optimistic message removal
 *
 * Note: Uses client-side timestamp for optimistic updates. This is a deliberate
 * trade-off for instant reconciliation without additional RPC call. Slight clock
 * skew (typically <1s) corrects on next conversation load or page refresh.
 *
 * Callbacks (onSuccess/onError) use refs internally for stability - callers
 * don't need to memoize them.
 */
export function useOptimisticSendMessage({
  selectedConversation,
  currentUserId,
  setMessages,
  onSuccess,
  onError,
}: UseOptimisticSendMessageOptions) {
  // Use refs for callbacks to avoid recreating the send function when callbacks change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  return useCallback(
    async (text: string) => {
      if (!selectedConversation || !text.trim() || !currentUserId) return;

      const body = text.trim();
      const clientId = uuid();
      const createdAt = new Date().toISOString();

      // 1) Add optimistic message
      const optimisticMessage: OptimisticUIMessage = {
        id: clientId,
        text: body,
        timestamp: createdAt,
        senderId: CURRENT_USER_SENTINEL,
        senderName: "You",
        read: true,
        clientId,
        optimistic: true,
        conversationId: selectedConversation,
        authorId: currentUserId,
        body,
        createdAt,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // 2) RPC call
        const messageId = await sendMessage(selectedConversation, body);

        // 3) Reconcile optimistic with server copy
        setMessages((prev) =>
          prev.map((m): DisplayMessage => {
            if (isOptimisticUIMessage(m) && m.clientId === clientId) {
              return {
                id: String(messageId),
                text: body,
                timestamp: createdAt,
                senderId: CURRENT_USER_SENTINEL,
                senderName: "You",
                read: true,
              };
            }
            return m;
          })
        );

        // 4) Success callback
        onSuccessRef.current?.();
      } catch (err) {
        console.error("Failed to send message:", err);

        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((m) => !(isOptimisticUIMessage(m) && m.clientId === clientId))
        );

        // Let consumer handle error display
        onErrorRef.current?.(err);
      }
    },
    [selectedConversation, currentUserId, setMessages]
  );
}
