interface UnreadBadgeProps {
  count: number;
}

/**
 * Animated red badge showing unread message count.
 * Displays "99+" for counts over 99.
 *
 * Position this inside a relative container - badge uses absolute positioning.
 */
export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count === 0) return null;

  return (
    <div
      className="absolute -top-1 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center border-2 border-background animate-wiggle"
      role="status"
      aria-live="polite"
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}
