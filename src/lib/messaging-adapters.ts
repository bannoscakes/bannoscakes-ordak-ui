// lib/messaging-adapters.ts
import type { Message as RPCMessage, Conversation as RPCConversation } from './rpc-client';

export interface UIMessage {
  id: string;
  text: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  read: boolean;
}

export interface UIConversation {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'broadcast';
  participants: string[];
  participantCount?: number;
  lastMessage?: UIMessage;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  avatar?: string;
}

export const toId = (v: unknown) => (v == null ? '' : String(v));
export const CURRENT_USER_SENTINEL = 'current-user';

export function toUIMessage(msg: RPCMessage, currentUserId?: string): UIMessage {
  const isOwn = Boolean((msg as any).is_own_message) || (currentUserId && msg.sender_id === currentUserId);
  return {
    id: toId(msg.id),
    text: msg.body ?? '',
    timestamp: msg.created_at,
    senderId: isOwn ? CURRENT_USER_SENTINEL : toId(msg.sender_id),
    senderName: msg.sender_name || 'Unknown',
    read: isOwn,
  };
}

export function toUIConversation(conv: RPCConversation): UIConversation {
  const lastTimestamp = conv.last_message_at || conv.created_at;
  const lastSenderId = conv.last_message_sender_id ?? conv.created_by;
  const lastSenderName = conv.last_message_sender_name || 'Unknown';

  return {
    id: toId(conv.id),
    name: conv.name ?? 'Unnamed Conversation',
    type: conv.type,
    participants: [],
    participantCount: conv.participant_count,
    lastMessage: conv.last_message_text
      ? {
          // No explicit last_message_id in RPC; synthesize a stable preview id
          id: `${conv.id}:${lastTimestamp}`,
          text: conv.last_message_text,
          timestamp: lastTimestamp,
          senderId: toId(lastSenderId),
          senderName: lastSenderName,
          read: true,
        }
      : undefined,
    unreadCount: conv.unread_count ?? 0,
    isOnline: false,
    isPinned: false,
  };
}
