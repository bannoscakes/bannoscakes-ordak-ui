import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Hook for theme toggling with hydration-safe mounting guard.
 * Returns mounted state, resolved theme, and toggle function.
 */
export function useThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return {
    mounted,
    resolvedTheme,
    toggleTheme,
  };
}
