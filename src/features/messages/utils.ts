// src/features/messages/utils.ts
import type { Message, OptimisticMessage } from '../../types/messages';

export const isOptimistic = (m: Message): m is OptimisticMessage =>
  m != null && 'optimistic' in m && m.optimistic === true;
