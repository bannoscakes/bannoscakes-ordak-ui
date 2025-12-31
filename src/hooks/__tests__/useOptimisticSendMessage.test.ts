// src/hooks/__tests__/useOptimisticSendMessage.test.ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticSendMessage, type UseOptimisticSendMessageOptions } from '../useOptimisticSendMessage';
import { sendMessage } from '../../lib/rpc-client';
import { isOptimisticUIMessage } from '../../lib/messaging-adapters';
import type { DisplayMessage } from '../../lib/messaging-adapters';

// Mock dependencies
vi.mock('../../lib/rpc-client', () => ({
  sendMessage: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-123',
}));

describe('useOptimisticSendMessage', () => {
  let mockSetMessages: Mock;
  let mockOnSuccess: Mock;
  let mockOnError: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetMessages = vi.fn();
    mockOnSuccess = vi.fn();
    mockOnError = vi.fn();
  });

  const createOptions = (overrides?: Partial<UseOptimisticSendMessageOptions>): UseOptimisticSendMessageOptions => ({
    selectedConversation: 'conv-123',
    currentUserId: 'user-456',
    setMessages: mockSetMessages,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    ...overrides,
  });

  describe('exports', () => {
    it('should export useOptimisticSendMessage function', () => {
      expect(typeof useOptimisticSendMessage).toBe('function');
    });

    it('should export UseOptimisticSendMessageOptions type', () => {
      // Type check - this will fail at compile time if the type is not exported
      const opts: UseOptimisticSendMessageOptions = {
        selectedConversation: 'test',
        currentUserId: 'test',
        setMessages: vi.fn(),
      };
      expect(opts).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should return early if selectedConversation is null', async () => {
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions({ selectedConversation: null }))
      );

      await act(async () => {
        await result.current('Hello');
      });

      expect(mockSetMessages).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should return early if currentUserId is undefined', async () => {
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions({ currentUserId: undefined }))
      );

      await act(async () => {
        await result.current('Hello');
      });

      expect(mockSetMessages).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should return early if text is empty', async () => {
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('   ');
      });

      expect(mockSetMessages).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('optimistic update', () => {
    it('should add optimistic message before RPC call', async () => {
      (sendMessage as Mock).mockResolvedValue(999);
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      // Check that setMessages was called to add optimistic message
      expect(mockSetMessages).toHaveBeenCalled();

      // Get the updater function from first call
      const firstCall = mockSetMessages.mock.calls[0][0];
      const addedMessages = firstCall([]);

      expect(addedMessages).toHaveLength(1);
      expect(addedMessages[0]).toMatchObject({
        id: 'mock-uuid-123',
        text: 'Hello world',
        clientId: 'mock-uuid-123',
        optimistic: true,
        conversationId: 'conv-123',
        authorId: 'user-456',
      });
    });
  });

  describe('reconciliation', () => {
    it('should replace optimistic message with server response on success', async () => {
      (sendMessage as Mock).mockResolvedValue(999);
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      // setMessages should be called twice: once for optimistic, once for reconciliation
      expect(mockSetMessages).toHaveBeenCalledTimes(2);

      // Get the reconciliation updater
      const reconcileCall = mockSetMessages.mock.calls[1][0];

      // Create an optimistic message to test the mapper
      const optimisticMsg: DisplayMessage = {
        id: 'mock-uuid-123',
        text: 'Hello world',
        timestamp: '2024-01-01T00:00:00.000Z',
        senderId: 'current-user',
        senderName: 'You',
        read: true,
        clientId: 'mock-uuid-123',
        optimistic: true,
        conversationId: 'conv-123',
        authorId: 'user-456',
        body: 'Hello world',
        createdAt: '2024-01-01T00:00:00.000Z',
      } as DisplayMessage;

      const result2 = reconcileCall([optimisticMsg]);

      // Should replace with confirmed message (id from server)
      expect(result2[0].id).toBe('999');
      expect((result2[0] as Record<string, unknown>).optimistic).toBeUndefined();
    });

    it('should call onSuccess after successful send', async () => {
      (sendMessage as Mock).mockResolvedValue(999);
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should remove optimistic message on failure', async () => {
      const error = new Error('Network error');
      (sendMessage as Mock).mockRejectedValue(error);
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      // setMessages should be called twice: once for optimistic, once for removal
      expect(mockSetMessages).toHaveBeenCalledTimes(2);

      // Get the filter updater
      const filterCall = mockSetMessages.mock.calls[1][0];

      // Create messages array with the optimistic message
      const optimisticMsg = {
        id: 'mock-uuid-123',
        clientId: 'mock-uuid-123',
        optimistic: true,
      } as DisplayMessage;

      const otherMsg = {
        id: 'other-msg',
      } as DisplayMessage;

      const result2 = filterCall([optimisticMsg, otherMsg]);

      // Should filter out the optimistic message
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe('other-msg');
    });

    it('should call onError with the error on failure', async () => {
      const error = new Error('Network error');
      (sendMessage as Mock).mockRejectedValue(error);
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      expect(mockOnError).toHaveBeenCalledWith(error);
    });

    it('should not call onSuccess on failure', async () => {
      (sendMessage as Mock).mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useOptimisticSendMessage(createOptions())
      );

      await act(async () => {
        await result.current('Hello world');
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('callback stability', () => {
    it('should maintain stable reference when callbacks change', async () => {
      (sendMessage as Mock).mockResolvedValue(999);
      const newOnSuccess = vi.fn();

      const { result, rerender } = renderHook(
        (props: UseOptimisticSendMessageOptions) => useOptimisticSendMessage(props),
        { initialProps: createOptions() }
      );

      const initialRef = result.current;

      // Rerender with a new callback
      rerender(createOptions({ onSuccess: newOnSuccess }));

      // Function reference should be stable
      expect(result.current).toBe(initialRef);

      // But the new callback should be called
      await act(async () => {
        await result.current('Test message');
      });

      expect(newOnSuccess).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});

describe('isOptimisticUIMessage type guard', () => {
  it('should identify optimistic messages', () => {
    const optimistic = {
      id: '123',
      text: 'test',
      timestamp: '2024-01-01',
      senderId: 'user',
      senderName: 'Test',
      read: true,
      optimistic: true,
      clientId: 'client-123',
      conversationId: 'conv-123',
      authorId: 'user-123',
      body: 'test',
      createdAt: '2024-01-01',
    };

    expect(isOptimisticUIMessage(optimistic)).toBe(true);
  });

  it('should return false for regular messages', () => {
    const regular = {
      id: '123',
      text: 'test',
      timestamp: '2024-01-01',
      senderId: 'user',
      senderName: 'Test',
      read: true,
    };

    expect(isOptimisticUIMessage(regular)).toBe(false);
  });
});
