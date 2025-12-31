// src/types/messages.ts
// =============================================================================
// DOMAIN/RPC LAYER MESSAGE TYPES
// =============================================================================
// These types represent messages at the RPC/domain layer - the shape of data
// as it comes from or goes to the database/server.
//
// For UI-layer types (transformed for display), see: src/lib/messaging-adapters.ts
// =============================================================================

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
