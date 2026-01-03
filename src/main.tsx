
// Boot-time URL normalizer: strip bad paths before the app mounts
if (typeof window !== "undefined") {
  const p = window.location.pathname;
  if (!p || p === "/false") {
    window.history.replaceState({}, "", "/");        // single-URL root
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
// CSS import order matters: globals.css defines variables, index.css uses them
import "./styles/globals.css";
import "./index.css";
import { initErrorMonitoring, SentryErrorBoundary } from "./lib/error-monitoring";
import { ThemeProvider } from "./components/ThemeProvider";

// Initialize error monitoring (Sentry)
initErrorMonitoring();

// Dev-only history guard to catch bad navigation attempts
if (import.meta.env.DEV) {
  import("./lib/devHistoryGuard").then(m => m.installDevHistoryGuard());
}

createRoot(document.getElementById("root")!).render(
  <SentryErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </SentryErrorBoundary>
);
  