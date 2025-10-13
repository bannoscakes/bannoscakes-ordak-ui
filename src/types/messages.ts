// src/types/messages.ts
export type MessageId = number;

export interface BaseMessage {
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
}

export interface ServerMessage extends BaseMessage {
  id: MessageId;       // comes from DB
}

export interface OptimisticMessage extends BaseMessage {
  // no server id yet
  clientId: string;    // uuid v4
  optimistic: true;
}

export type Message = ServerMessage | OptimisticMessage;
