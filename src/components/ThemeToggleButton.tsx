import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";
import { useThemeToggle } from "@/hooks/useThemeToggle";

interface ThemeToggleButtonProps {
  /** Show label text next to icon */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Theme toggle button with sun/moon icon.
 * Hydration-safe - only renders after client mount.
 */
export function ThemeToggleButton({ showLabel = false, className = "" }: ThemeToggleButtonProps) {
  const { mounted, resolvedTheme, toggleTheme } = useThemeToggle();

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
    >
      {isDark ? (
        <Sun className={showLabel ? "h-5 w-5 mr-3" : "h-4 w-4"} />
      ) : (
        <Moon className={showLabel ? "h-5 w-5 mr-3" : "h-4 w-4"} />
      )}
      {showLabel && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
    </Button>
  );
}
