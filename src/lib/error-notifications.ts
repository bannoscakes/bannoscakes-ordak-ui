import { toast } from 'sonner';
import { AppError, getErrorMessage, getErrorCode, getRecoveryActions, ErrorCode } from './error-handler';

export interface ErrorNotificationOptions {
  title?: string;
  /** Optional long description to show in the UI / console. */
  description?: string; // ✅ allow description so callers compile cleanly
  duration?: number;
  showRecoveryActions?: boolean;
  showTechnicalDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Show error notification using toast
 */
export const showErrorNotification = (
  error: unknown,
  options: ErrorNotificationOptions = {}
) => {
  const {
    title,
    description,
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
  let finalDescription = description || message;
  if (showRecoveryActions && recoveryActions.length > 0) {
    finalDescription += `\n\nSuggested actions:\n• ${recoveryActions.slice(0, 2).join('\n• ')}`;
  }

  // Show technical details in development
  if (showTechnicalDetails && isAppError && error instanceof Error && 'correlationId' in error && 'code' in error) {
    const appError = error as any;
    finalDescription += `\n\nTechnical Details:\nError ID: ${appError.correlationId?.slice(-8) || 'N/A'}\nCode: ${appError.code || 'N/A'}`;
  }

  // Log description to console if provided
  if (description) {
    console.error(description);
  }

  // Show toast based on type
  switch (notificationType) {
    case 'warning':
      toast.warning(notificationTitle, {
        description: finalDescription,
        duration,
        action: actions.length > 0 ? actions[0] : undefined,
      });
      break;
      
    case 'error':
    default:
      toast.error(notificationTitle, {
        description: finalDescription,
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
    case 'error':
      showErrorNotification(new Error(title), { title: 'Error', description });
      break;
    case 'info':
      showInfoNotification(title, description);
      break;
  }
};

/**
 * Hook for error notifications with retry functionality
 */
export const useErrorNotifications = () => {
  const showError = (
    error: unknown,
    options: ErrorNotificationOptions = {}
  ) => {
    showErrorNotification(error, options);
  };

  const showErrorWithRetry = (
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
  };

  const showSuccess = (title: string, description?: string) => {
    showSuccessNotification(title, description);
  };

  const showInfo = (title: string, description?: string) => {
    showInfoNotification(title, description);
  };

  const showLoading = (title: string, description?: string) => {
    return showLoadingNotification(title, description);
  };

  const updateLoading = (
    toastId: string | number,
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    updateLoadingNotification(toastId, title, description, type);
  };

  return {
    showError,
    showErrorWithRetry,
    showSuccess,
    showInfo,
    showLoading,
    updateLoading,
  };
};
