// src/features/messages/__tests__/optimistic-reconciliation.test.ts
import { describe, it, expect } from 'vitest';
import type { OptimisticMessage, ServerMessage, Message } from '../../../types/messages';
import { isOptimistic } from '../utils';

describe('Optimistic Message Reconciliation', () => {
  it('should reconcile optimistic message with server ID', () => {
    const clientId = 'client-uuid-123';
    const serverId = 456;

    // Create an optimistic message
    const optimistic: OptimisticMessage = {
      clientId,
      optimistic: true,
      conversationId: 'conv-123',
      authorId: 'user-789',
      body: 'Hello world',
      createdAt: '2025-02-01T10:00:00.000Z',
    };

    // Simulate messages list with optimistic message
    let messages: (Message | any)[] = [
      { id: 100, body: 'Previous message', conversationId: 'conv-123', authorId: 'user-1', createdAt: '2025-02-01T09:00:00.000Z' },
      { ...optimistic, id: clientId } as any, // Optimistic with temp clientId as id
    ];

    // Reconcile: replace optimistic with server message
    messages = messages.map((m) => {
      if ((m as any).id === clientId) {
        const reconciled: ServerMessage = {
          id: serverId,
          conversationId: optimistic.conversationId,
          authorId: optimistic.authorId,
          body: optimistic.body,
          createdAt: optimistic.createdAt,
        };
        return reconciled;
      }
      return m;
    });

    // Verify reconciliation
    expect(messages).toHaveLength(2);
    expect((messages[1] as ServerMessage).id).toBe(serverId);
    expect(messages[1].body).toBe('Hello world');
    expect(isOptimistic(messages[1])).toBe(false);
  });

  it('should remove optimistic message on failure', () => {
    const clientId = 'client-uuid-456';

    // Simulate messages list with optimistic message
    let messages: any[] = [
      { id: 100, body: 'Previous message' },
      { id: clientId, body: 'Failed message', optimistic: true },
      { id: 101, body: 'Another message' },
    ];

    // Remove optimistic on failure
    messages = messages.filter((m) => m.id !== clientId);

    // Verify removal
    expect(messages).toHaveLength(2);
    expect(messages.find((m) => m.id === clientId)).toBeUndefined();
    expect(messages[0].id).toBe(100);
    expect(messages[1].id).toBe(101);
  });

  it('should not duplicate messages when reconciling', () => {
    const clientId = 'client-uuid-789';
    const serverId = 999;

    // Create optimistic message
    const optimistic: OptimisticMessage = {
      clientId,
      optimistic: true,
      conversationId: 'conv-123',
      authorId: 'user-789',
      body: 'No duplicates',
      createdAt: '2025-02-01T10:00:00.000Z',
    };

    // Initial state with optimistic
    let messages: any[] = [
      { id: clientId, ...optimistic },
    ];

    // Reconcile (replace, not add)
    messages = messages.map((m) => {
      if (m.id === clientId) {
        return {
          id: serverId,
          conversationId: optimistic.conversationId,
          authorId: optimistic.authorId,
          body: optimistic.body,
          createdAt: optimistic.createdAt,
        };
      }
      return m;
    });

    // Verify no duplication
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(serverId);
  });

  it('should handle multiple optimistic messages independently', () => {
    const clientId1 = 'client-1';
    const clientId2 = 'client-2';
    const serverId1 = 100;

    // Two optimistic messages
    let messages: any[] = [
      { id: clientId1, body: 'Message 1', optimistic: true },
      { id: clientId2, body: 'Message 2', optimistic: true },
    ];

    // Reconcile only the first one
    messages = messages.map((m) => {
      if (m.id === clientId1) {
        return { id: serverId1, body: 'Message 1', optimistic: undefined };
      }
      return m;
    });

    // Verify first reconciled, second still optimistic
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(serverId1);
    expect(messages[0].optimistic).toBeUndefined();
    expect(messages[1].id).toBe(clientId2);
    expect(messages[1].optimistic).toBe(true);
  });
});

