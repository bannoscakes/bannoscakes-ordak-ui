import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Whether dark mode is currently active (resolves "system" to actual preference) */
  resolvedIsDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES: readonly Theme[] = ["light", "dark", "system"] as const;

const isValidTheme = (value: string | null): value is Theme => {
  return value !== null && VALID_THEMES.includes(value as Theme);
};

const applyThemeClass = (isDark: boolean) => {
  const root = document.documentElement;
  root.classList.remove("dark");
  if (isDark) {
    root.classList.add("dark");
  }
};

const resolveIsDark = (theme: Theme): boolean => {
  return theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      return isValidTheme(stored) ? stored : "light";
    }
    return "light";
  });

  const [resolvedIsDark, setResolvedIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return resolveIsDark(theme);
    }
    return false;
  });

  useEffect(() => {
    const isDark = resolveIsDark(theme);
    setResolvedIsDark(isDark);
    applyThemeClass(isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const isDark = mediaQuery.matches;
      setResolvedIsDark(isDark);
      applyThemeClass(isDark);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
