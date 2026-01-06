// Single source of truth for role-based styling

// Role constants (lowercase for case-insensitive matching)
export const ROLE_ADMIN = "admin";
export const ROLE_SUPERVISOR = "supervisor";
export const ROLE_STAFF = "staff";

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
    case ROLE_ADMIN:
      return "bg-[var(--sidebar-primary)] text-white";
    case ROLE_SUPERVISOR:
      return "bg-pink-500 text-white";
    case ROLE_STAFF:
    default:
      return "bg-green-500 text-white";
  }
}
