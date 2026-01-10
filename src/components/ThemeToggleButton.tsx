import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./ui/button";
import { useThemeToggle } from "@/hooks/useThemeToggle";

interface ThemeToggleButtonProps {
  /** Show label text next to icon */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Theme toggle button cycling through light/dark/system modes.
 * Hydration-safe - only renders after client mount.
 */
export function ThemeToggleButton({ showLabel = false, className = "" }: ThemeToggleButtonProps) {
  const { mounted, theme, toggleTheme } = useThemeToggle();

  if (!mounted) return null;

  const iconClass = showLabel ? "h-5 w-5 mr-3" : "h-5 w-5";

  const getIcon = () => {
    if (theme === "dark") return <Moon className={iconClass} />;
    if (theme === "system") return <Monitor className={iconClass} />;
    return <Sun className={iconClass} />;
  };

  const getLabel = () => {
    if (theme === "dark") return "Dark Mode";
    if (theme === "system") return "System";
    return "Light Mode";
  };

  const getAriaLabel = () => {
    if (theme === "light") return "Theme: Light Mode. Click to switch to dark mode";
    if (theme === "dark") return "Theme: Dark Mode. Click to switch to system mode";
    return "Theme: System. Click to switch to light mode";
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleTheme}
      role="switch"
      aria-checked={theme === "dark"}
      aria-label={getAriaLabel()}
      className={className}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </Button>
  );
}
