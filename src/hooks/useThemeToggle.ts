import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Hook for theme toggling with hydration-safe mounting guard.
 * Cycles through: light → dark → system → light
 * Returns mounted state, theme setting, resolved theme, and toggle function.
 */
export function useThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    // Cycle: light → dark → system → light
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
  };

  return {
    mounted,
    theme,
    resolvedTheme,
    toggleTheme,
  };
}
