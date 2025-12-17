
// Boot-time URL normalizer: strip bad paths before the app mounts
if (typeof window !== "undefined") {
  const p = window.location.pathname;
  if (!p || p === "/false") {
    window.history.replaceState({}, "", "/");        // single-URL root
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initErrorMonitoring, SentryErrorBoundary } from "./lib/error-monitoring";
import { installDevHistoryGuard } from "./lib/devHistoryGuard";

// Initialize error monitoring (Sentry)
initErrorMonitoring();

// Dev-only history guard to catch bad navigation attempts
// NOTE: This must run synchronously BEFORE React renders to avoid race conditions
// with RoleBasedRouter's pushState patching
if (import.meta.env.DEV) {
  installDevHistoryGuard();
}

createRoot(document.getElementById("root")!).render(
  <SentryErrorBoundary>
    <App />
  </SentryErrorBoundary>
);
