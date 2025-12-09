import { useCallback } from 'react';
import { toast } from 'sonner';
import { AppError, getErrorMessage, getErrorCode, getRecoveryActions, ErrorCode } from './error-handler';

/**
 * Options for error notifications
 * Note: description is NOT supported - it's built automatically from the error message,
 * recovery actions, and technical details
 */
export interface ErrorNotificationOptions {
  /** Title of the notification (defaults to "Error" or "Warning") */
  title?: string;
  /** Duration in milliseconds (default: 5000) */
  duration?: number;
  /** Whether to show recovery action suggestions (default: false) */
  showRecoveryActions?: boolean;
  /** Whether to show technical details like error codes (default: false) */
  showTechnicalDetails?: boolean;
  /** Callback for retry button */
  onRetry?: () => void;
  /** Callback for dismiss button */
  onDismiss?: () => void;
}

/**
 * Show error notification using toast
 * Description is built automatically from error message, recovery actions, and technical details
 */
export const showErrorNotification = (
  error: unknown,
  options: ErrorNotificationOptions = {}
) => {
  const {
    title,
    duration = 5000,
    showRecoveryActions = false,
    showTechnicalDetails = false,
    onRetry,
    onDismiss,
  } = options;

  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const recoveryActions = getRecoveryActions(error);
  const isAppError = error instanceof AppError;

  // Determine notification type based on error code
  const getNotificationType = (code: ErrorCode | null) => {
    if (!code) return 'error';
    
    if (code.startsWith('AUTH')) return 'error';
    if (code.startsWith('SYS')) return 'error';
    if (code.startsWith('ORD') && (code === 'ORD001' || code === 'ORD002')) return 'error';
    if (code.startsWith('INV') && code === 'INV001') return 'warning';
    if (code.startsWith('VAL')) return 'warning';
    
    return 'error';
  };

  const notificationType = getNotificationType(code);
  const notificationTitle = title || (notificationType === 'warning' ? 'Warning' : 'Error');

  // Build action buttons
  const actions = [];
  
  if (onRetry) {
    actions.push({
      label: 'Retry',
      onClick: onRetry,
    });
  }
  
  if (onDismiss) {
    actions.push({
      label: 'Dismiss',
      onClick: onDismiss,
    });
  }

  // Show recovery actions as additional info
  let description = message;
  if (showRecoveryActions && recoveryActions.length > 0) {
    description += `\n\nSuggested actions:\n• ${recoveryActions.slice(0, 2).join('\n• ')}`;
  }

  // Show technical details in development
  if (showTechnicalDetails && isAppError) {
    description += `\n\nTechnical Details:\nError ID: ${error.correlationId?.slice(-8) || 'N/A'}\nCode: ${error.code}`;
  }

  // Show toast based on type
  switch (notificationType) {
    case 'warning':
      toast.warning(notificationTitle, {
        description,
        duration,
        action: actions.length > 0 ? actions[0] : undefined,
      });
      break;
      
    case 'error':
    default:
      toast.error(notificationTitle, {
        description,
        duration,
        action: actions.length > 0 ? actions[0] : undefined,
      });
      break;
  }
};

/**
 * Show success notification
 */
export const showSuccessNotification = (
  title: string,
  description?: string,
  duration = 3000
) => {
  toast.success(title, {
    description,
    duration,
  });
};

/**
 * Show info notification
 */
export const showInfoNotification = (
  title: string,
  description?: string,
  duration = 4000
) => {
  toast.info(title, {
    description,
    duration,
  });
};

/**
 * Show loading notification
 */
export const showLoadingNotification = (
  title: string,
  description?: string
) => {
  return toast.loading(title, {
    description,
  });
};

/**
 * Update loading notification
 */
export const updateLoadingNotification = (
  toastId: string | number,
  title: string,
  description?: string,
  type: 'success' | 'error' | 'info' = 'success'
) => {
  toast.dismiss(toastId);
  
  switch (type) {
    case 'success':
      showSuccessNotification(title, description);
      break;
    case 'error': {
      const message = (title?.trim() || description?.trim() || 'Error');
      showErrorNotification(new Error(message), { title: 'Error' });
      break;
    }
    case 'info':
      showInfoNotification(title, description);
      break;
  }
};

/**
 * Hook for error notifications with retry functionality
 * Note: All functions are stable references (memoized) to prevent useEffect loops
 */
export const useErrorNotifications = () => {
  const showError = useCallback((
    error: unknown,
    options: ErrorNotificationOptions = {}
  ) => {
    showErrorNotification(error, options);
  }, []);

  const showErrorWithRetry = useCallback((
    error: unknown,
    retryFn: () => Promise<void>,
    options: Omit<ErrorNotificationOptions, 'onRetry'> = {}
  ) => {
    const handleRetry = async () => {
      try {
        await retryFn();
      } catch (retryError) {
        showErrorNotification(retryError, {
          title: 'Retry Failed',
          ...options,
        });
      }
    };

    showErrorNotification(error, {
      ...options,
      onRetry: handleRetry,
      showRecoveryActions: true,
    });
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    showSuccessNotification(title, description);
  }, []);

  const showInfo = useCallback((title: string, description?: string) => {
    showInfoNotification(title, description);
  }, []);

  const showLoading = useCallback((title: string, description?: string) => {
    return showLoadingNotification(title, description);
  }, []);

  const updateLoading = useCallback((
    toastId: string | number,
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    updateLoadingNotification(toastId, title, description, type);
  }, []);

  return {
    showError,
    showErrorWithRetry,
    showSuccess,
    showInfo,
    showLoading,
    updateLoading,
  };
};
