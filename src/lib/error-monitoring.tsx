import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry error monitoring
 * Only initializes if VITE_SENTRY_DSN is provided
 */
export function initErrorMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log("Sentry not configured - VITE_SENTRY_DSN not provided");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    debug: import.meta.env.DEV,
  });

  console.log("Sentry initialized for error monitoring");
}

/**
 * Sentry Error Boundary component
 * Wraps the app to catch and report React errors
 */
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError }) => (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          An error occurred and has been reported. Please try refreshing the page.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    ),
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag("errorBoundary", true);
      scope.setContext("errorInfo", errorInfo as any);
    },
  }
);
