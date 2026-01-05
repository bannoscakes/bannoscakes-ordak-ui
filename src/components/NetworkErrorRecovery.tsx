import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NetworkErrorRecoveryProps {
  onRetry?: () => void;
  onDismiss?: () => void;
  showWhenOffline?: boolean;
  className?: string;
}

export const NetworkErrorRecovery: React.FC<NetworkErrorRecoveryProps> = ({
  onRetry,
  onDismiss,
  showWhenOffline = true,
  className = '',
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Test network connectivity
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      setIsOnline(true);
      onRetry?.();
    } catch (error) {
      console.error('Network retry failed:', error);
      // Keep offline state
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show anything if online and showWhenOffline is true
  if (isOnline && showWhenOffline) {
    return null;
  }

  // Show offline indicator
  if (!isOnline) {
    return (
      <Card className={`border-warning/30 bg-warning/10 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-warning" />
            <CardTitle className="text-lg text-warning">
              Network Connection Lost
            </CardTitle>
          </div>
          <CardDescription className="text-warning/80">
            You're currently offline. Some features may not work properly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-warning border-warning/30">
                Offline
              </Badge>
              {retryCount > 0 && (
                <Badge variant="secondary">
                  Retry #{retryCount}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              
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
            
            <div className="text-xs text-warning space-y-1">
              <p>• Check your internet connection</p>
              <p>• Try refreshing the page</p>
              <p>• Contact support if the problem persists</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show general network error (when online but having issues)
  return (
    <Card className={`border-destructive/30 bg-destructive/10 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <CardTitle className="text-lg text-destructive">
            Network Error
          </CardTitle>
        </div>
        <CardDescription className="text-destructive/80">
          There was a problem connecting to the server. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {retryCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Retry #{retryCount}
              </Badge>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </>
              )}
            </Button>
            
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
        </div>
      </CardContent>
    </Card>
  );
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Test connection speed
    const testConnectionSpeed = async () => {
      const startTime = Date.now();
      try {
        await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });
        const duration = Date.now() - startTime;
        setIsSlowConnection(duration > 2000);
      } catch (error) {
        setIsSlowConnection(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connection speed periodically
    const interval = setInterval(testConnectionSpeed, 30000);
    testConnectionSpeed(); // Initial test

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isSlowConnection,
    isOffline: !isOnline,
  };
};
