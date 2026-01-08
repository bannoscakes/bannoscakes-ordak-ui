import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Disable CSS transitions during theme change to prevent 77+ simultaneous
      // transitions from causing 1200ms+ rendering lag (measured via Performance profiling).
      // Without this, theme toggle triggers CSS transitions on all elements, causing
      // noticeable stuttering and poor UX. See PR #652 for performance analysis.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
