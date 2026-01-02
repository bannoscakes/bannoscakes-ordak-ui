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
      key={count}
      className="absolute -top-1 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white animate-wiggle"
      aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
      role="status"
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}
