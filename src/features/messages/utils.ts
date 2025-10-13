// src/features/messages/utils.ts
import type { Message, OptimisticMessage } from '../../types/messages';

export const isOptimistic = (m: Message): m is OptimisticMessage =>
  (m as any).optimistic === true;
