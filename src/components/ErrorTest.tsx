import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useErrorNotifications } from '@/lib/error-notifications';
import { createError, ErrorCode } from '@/lib/error-handler';

/**
 * Test component to verify error handling functionality
 * This should be removed in production
 */
export const ErrorTest: React.FC = () => {
  const [testError, setTestError] = useState<unknown>(null);
  const { showError, showErrorWithRetry } = useErrorNotifications();

  const testNetworkError = () => {
    const error = new Error('Network request failed');
    setTestError(error);
    showError(error, {
      title: 'Network Error',
      showRecoveryActions: true,
    });
  };

  const testAppError = () => {
    const error = createError(
      ErrorCode.ORD001,
      'Order not found',
      { orderId: 'test-123' },
      { component: 'ErrorTest' }
    );
    setTestError(error);
    showError(error, {
      title: 'Order Error',
      showRecoveryActions: true,
      showTechnicalDetails: true,
    });
  };

  const testAuthError = () => {
    const error = createError(
      ErrorCode.AUTH004,
      'Insufficient permissions',
      { requiredRole: 'Supervisor', currentRole: 'Staff' },
      { component: 'ErrorTest', action: 'delete_order' }
    );
    setTestError(error);
    showError(error, {
      title: 'Permission Error',
      showRecoveryActions: true,
    });
  };

  const testRetryError = () => {
    let retryCount = 0;
    const error = createError(
      ErrorCode.SYS002,
      'Database connection failed',
      { attempt: 1 },
      { component: 'ErrorTest' }
    );

    const retryFn = async () => {
      retryCount++;
      if (retryCount < 3) {
        throw createError(
          ErrorCode.SYS002,
          `Retry ${retryCount} failed`,
          { attempt: retryCount },
          { component: 'ErrorTest' }
        );
      }
      // Success on 3rd attempt
      setTestError(null);
    };

    setTestError(error);
    showErrorWithRetry(error, retryFn, {
      title: 'Retry Test',
      showRecoveryActions: true,
    });
  };

  const clearError = () => {
    setTestError(null);
  };

  const simulateCrash = () => {
    throw new Error('Simulated component crash for error boundary testing');
  };

  if (import.meta.env.PROD) {
    return null; // Don't render in production
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Error Handling Test</CardTitle>
        <CardDescription>
          Test various error scenarios to verify error handling functionality.
          This component is only available in development mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={testNetworkError}
            className="h-10"
          >
            Test Network Error
          </Button>
          
          <Button
            variant="outline"
            onClick={testAppError}
            className="h-10"
          >
            Test App Error
          </Button>
          
          <Button
            variant="outline"
            onClick={testAuthError}
            className="h-10"
          >
            Test Auth Error
          </Button>
          
          <Button
            variant="outline"
            onClick={testRetryError}
            className="h-10"
          >
            Test Retry Error
          </Button>
        </div>

        <Button
          variant="destructive"
          onClick={simulateCrash}
          className="w-full h-10"
        >
          Test Error Boundary (Simulate Crash)
        </Button>

        {!!testError && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Error Display Test</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
              >
                Clear
              </Button>
            </div>
            
            <ErrorDisplay
              error={testError}
              title="Test Error"
              onRetry={() => {
                clearError();
              }}
              onDismiss={clearError}
              variant="card"
              showDetails={true}
            />
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Network Error: Tests basic error display</p>
          <p>• App Error: Tests structured error with correlation ID</p>
          <p>• Auth Error: Tests permission error with recovery actions</p>
          <p>• Retry Error: Tests retry functionality (fails 2 times, succeeds on 3rd)</p>
          <p>• Error Boundary: Tests React error boundary (will crash component)</p>
        </div>
      </CardContent>
    </Card>
  );
};
