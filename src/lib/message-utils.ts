/**
 * Message utility functions for iMessage-style UI
 * - Date grouping for message separators
 * - Avatar color generation from names
 * - Message clustering for consecutive messages
 */

import type { UIMessage } from './messaging-adapters';

// ============================================
// Date Grouping
// ============================================

export interface MessageGroup {
  date: string; // ISO date string (YYYY-MM-DD)
  label: string; // Display label (e.g., "Today", "Yesterday", "Dec 5")
  messages: UIMessage[];
}

/**
 * Get local date key (YYYY-MM-DD) from a Date object
 */
function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Group messages by date for display with date separators
 */
export function groupMessagesByDate(messages: UIMessage[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: Map<string, UIMessage[]> = new Map();

  for (const msg of messages) {
    // Handle invalid timestamps gracefully - use local date for grouping
    const date = new Date(msg.timestamp);
    const dateKey = isNaN(date.getTime()) ? 'unknown' : getLocalDateKey(date);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(msg);
  }

  // Use local dates for today/yesterday comparison
  const now = new Date();
  const today = getLocalDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateKey(yesterdayDate);

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, msgs]) => ({
      date: dateKey,
      label: dateKey === 'unknown' ? 'Messages' : formatDateLabel(dateKey, today, yesterday),
      messages: msgs,
    }));
}

function formatDateLabel(dateKey: string, today: string, yesterday: string): string {
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  const date = new Date(dateKey + 'T12:00:00');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Avatar Colors
// ============================================

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
] as const;

/**
 * Generate consistent avatar background color from name
 */
export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================
// Message Clustering
// ============================================

/**
 * Check if two messages should be visually grouped (same sender, close in time)
 * Used to hide avatar and reduce spacing for consecutive messages
 */
export function shouldGroupWithPrevious(
  current: UIMessage,
  previous: UIMessage | undefined
): boolean {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;

  const currentDate = new Date(current.timestamp);
  const previousDate = new Date(previous.timestamp);

  // If either timestamp is invalid, don't group
  if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) return false;

  const timeDiff = currentDate.getTime() - previousDate.getTime();
  return timeDiff < 60000; // Within 1 minute
}

/**
 * Format timestamp for message display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
