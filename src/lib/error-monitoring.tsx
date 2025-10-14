import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error monitoring
 * Only initializes if VITE_SENTRY_DSN is provided
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    return; // no-op if DSN not set
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.DEV ? 0 : 0.1,
    replaysSessionSampleRate: 0,          // off by default
    replaysOnErrorSampleRate: 0.5,        // optional: replay on errors only
  });
}

// Backward compatibility
export const initErrorMonitoring = initSentry;

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
