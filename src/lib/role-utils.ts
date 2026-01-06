// Single source of truth for role-based styling

/**
 * Returns Tailwind classes for staff avatar colors based on role.
 * - Admin: brand orange (#FF6B00 from --sidebar-primary)
 * - Supervisor: pink
 * - Staff (default): green
 *
 * Handles null/undefined and case-insensitive matching.
 */
export function getRoleAvatarColor(role: string | null | undefined): string {
  const normalizedRole = role?.trim().toLowerCase();
  switch (normalizedRole) {
    case "admin":
      return "bg-[var(--sidebar-primary)] text-white";
    case "supervisor":
      return "bg-pink-500 text-white";
    case "staff":
    default:
      return "bg-green-500 text-white";
  }
}
