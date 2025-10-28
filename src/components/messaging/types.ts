import type { Message as BaseMessage } from '../../types/messages';

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  read: boolean;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: "direct" | "group" | "broadcast";
  participants: string[];
  participantCount?: number;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  avatar?: string;
}
