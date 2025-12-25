import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { AppError, getErrorMessage, getErrorCode, getRecoveryActions, ErrorCode } from '@/lib/error-handler';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  variant?: 'inline' | 'card' | 'alert';
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  onRetry,
  onDismiss,
  showDetails = false,
  variant = 'alert',
  className = '',
}) => {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const recoveryActions = getRecoveryActions(error);
  const isAppError = error instanceof AppError;

  const getSeverity = (code: ErrorCode | null) => {
    if (!code) return 'error';
    
    if (code.startsWith('AUTH')) return 'error';
    if (code.startsWith('SYS')) return 'error';
    if (code.startsWith('ORD') && (code === 'ORD001' || code === 'ORD002')) return 'error';
    if (code.startsWith('INV') && code === 'INV001') return 'warning';
    if (code.startsWith('VAL')) return 'warning';
    
    return 'error';
  };

  const severity = getSeverity(code);

  const renderInline = () => (
    <div className={`flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <span className="text-sm text-red-700 flex-1">{message}</span>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-10 w-10 p-0 text-red-600 hover:text-red-700"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  const renderAlert = () => (
    <Alert className={`${severity === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'} ${className}`}>
      <AlertTriangle className={`h-4 w-4 ${severity === 'warning' ? 'text-yellow-600' : 'text-red-600'}`} />
      <AlertTitle className={severity === 'warning' ? 'text-yellow-800' : 'text-red-800'}>
        {title || 'Error'}
      </AlertTitle>
      <AlertDescription className={severity === 'warning' ? 'text-yellow-700' : 'text-red-700'}>
        <div className="space-y-2">
          <p>{message}</p>
          
          {code && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {code}
              </Badge>
              {isAppError && error.correlationId && (
                <Badge variant="secondary" className="text-xs">
                  ID: {error.correlationId.slice(-8)}
                </Badge>
              )}
            </div>
          )}

          {recoveryActions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Suggested actions:</p>
              <ul className="text-xs space-y-1">
                {recoveryActions.slice(0, 3).map((action, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showDetails && isAppError && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs hover:underline">
                <ChevronRight className="w-3 h-3" />
                Technical Details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                <div className="space-y-1">
                  <div><strong>Correlation ID:</strong> {error.correlationId}</div>
                  <div><strong>Timestamp:</strong> {error.timestamp}</div>
                  {error.details != null && (
                    <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>
                  )}
                  {error.context != null && (
                    <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-7 px-3 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-7 px-3 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );

  const renderCard = () => (
    <Card className={`border-red-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <CardTitle className="text-lg text-red-800">
            {title || 'Error'}
          </CardTitle>
        </div>
        {code && (
          <CardDescription className="flex items-center gap-2">
            <Badge variant="outline">{code}</Badge>
            {isAppError && error.correlationId && (
              <span className="text-xs text-gray-500">
                ID: {error.correlationId.slice(-8)}
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-red-700">{message}</p>

        {recoveryActions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Suggested actions:</p>
            <ul className="text-sm space-y-1">
              {recoveryActions.map((action, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showDetails && isAppError && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm hover:underline">
              <ChevronRight className="w-4 h-4" />
              Technical Details
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 bg-gray-100 rounded text-sm font-mono">
              <div className="space-y-2">
                <div><strong>Correlation ID:</strong> {error.correlationId}</div>
                <div><strong>Timestamp:</strong> {error.timestamp}</div>
                {error.details != null && (
                  <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>
                )}
                {error.context != null && (
                  <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {(onRetry || onDismiss) && (
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="flex-1"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  switch (variant) {
    case 'inline':
      return renderInline();
    case 'card':
      return renderCard();
    case 'alert':
    default:
      return renderAlert();
  }
};

// Hook for displaying errors with toast notifications
export const useErrorDisplay = () => {
  const [errors, setErrors] = React.useState<unknown[]>([]);

  const addError = (error: unknown) => {
    setErrors(prev => [...prev, error]);
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    errors,
    addError,
    removeError,
    clearErrors,
  };
};
