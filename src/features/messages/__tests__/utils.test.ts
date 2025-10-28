// src/features/messages/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { isOptimistic } from '../utils';
import type { Message, ServerMessage, OptimisticMessage } from '../../../types/messages';

describe('isOptimistic', () => {
  it('should return true for optimistic messages', () => {
    const optimisticMessage: OptimisticMessage = {
      clientId: 'test-client-id',
      optimistic: true,
      conversationId: 'conv-123',
      authorId: 'user-456',
      body: 'Test message',
      createdAt: new Date().toISOString(),
    };

    expect(isOptimistic(optimisticMessage)).toBe(true);
  });

  it('should return false for server messages', () => {
    const serverMessage: ServerMessage = {
      id: 123,
      conversationId: 'conv-123',
      authorId: 'user-456',
      body: 'Test message',
      createdAt: new Date().toISOString(),
    };

    expect(isOptimistic(serverMessage)).toBe(false);
  });

  it('should return false for messages without optimistic flag', () => {
    const message = {
      id: 123,
      conversationId: 'conv-123',
      authorId: 'user-456',
      body: 'Test message',
      createdAt: new Date().toISOString(),
    } as Message;

    expect(isOptimistic(message)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isOptimistic(null as any)).toBe(false);
    expect(isOptimistic(undefined as any)).toBe(false);
  });

  it('should handle messages with optimistic: false', () => {
    const message = {
      id: 123,
      conversationId: 'conv-123',
      authorId: 'user-456',
      body: 'Test message',
      createdAt: new Date().toISOString(),
      optimistic: false,
    } as any;

    expect(isOptimistic(message)).toBe(false);
  });
});

