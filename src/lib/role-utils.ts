// Single source of truth for role-based styling

/**
 * Returns Tailwind classes for staff avatar colors based on role.
 * - Admin: orange
 * - Supervisor: pink
 * - Staff (default): green
 */
export function getRoleAvatarColor(role: string): string {
  switch (role) {
    case "Admin":
      return "bg-orange-500 text-white";
    case "Supervisor":
      return "bg-pink-500 text-white";
    case "Staff":
    default:
      return "bg-green-500 text-white";
  }
}
