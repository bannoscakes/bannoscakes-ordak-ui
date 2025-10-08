// Structured error codes and handling
export enum ErrorCode {
  // Order related errors
  ORD001 = 'ORD001', // Order not found
  ORD002 = 'ORD002', // Invalid stage transition
  ORD003 = 'ORD003', // Order already completed
  ORD004 = 'ORD004', // Invalid order data
  
  // Inventory related errors
  INV001 = 'INV001', // Insufficient stock
  INV002 = 'INV002', // Component not found
  INV003 = 'INV003', // Invalid inventory operation
  INV004 = 'INV004', // Stock adjustment failed
  
  // Authentication related errors
  AUTH001 = 'AUTH001', // Unauthorized access
  AUTH002 = 'AUTH002', // Invalid credentials
  AUTH003 = 'AUTH003', // Session expired
  AUTH004 = 'AUTH004', // Insufficient permissions
  
  // Sync related errors
  SYNC001 = 'SYNC001', // Shopify sync failed
  SYNC002 = 'SYNC002', // Webhook validation failed
  SYNC003 = 'SYNC003', // Duplicate order detected
  SYNC004 = 'SYNC004', // Inventory sync failed
  
  // System errors
  SYS001 = 'SYS001', // Database connection failed
  SYS002 = 'SYS002', // RPC function error
  SYS003 = 'SYS003', // Network timeout
  SYS004 = 'SYS004', // Configuration error
  
  // Validation errors
  VAL001 = 'VAL001', // Invalid input data
  VAL002 = 'VAL002', // Missing required field
  VAL003 = 'VAL003', // Data format error
  VAL004 = 'VAL004', // Business rule violation
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  correlationId?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly correlationId: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.correlationId = this.generateCorrelationId();
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private generateCorrelationId(): string {
    return `${this.code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

// Error message mappings for user-friendly display
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Order errors
  [ErrorCode.ORD001]: 'Order not found. Please check the order ID and try again.',
  [ErrorCode.ORD002]: 'Invalid stage transition. This operation is not allowed in the current stage.',
  [ErrorCode.ORD003]: 'Order is already completed and cannot be modified.',
  [ErrorCode.ORD004]: 'Invalid order data provided. Please check all required fields.',
  
  // Inventory errors
  [ErrorCode.INV001]: 'Insufficient stock available. Please restock before proceeding.',
  [ErrorCode.INV002]: 'Component not found. Please check the component SKU.',
  [ErrorCode.INV003]: 'Invalid inventory operation. Please try again.',
  [ErrorCode.INV004]: 'Stock adjustment failed. Please contact support.',
  
  // Authentication errors
  [ErrorCode.AUTH001]: 'Unauthorized access. Please log in and try again.',
  [ErrorCode.AUTH002]: 'Invalid credentials. Please check your email and password.',
  [ErrorCode.AUTH003]: 'Session expired. Please log in again.',
  [ErrorCode.AUTH004]: 'Insufficient permissions. Contact your administrator.',
  
  // Sync errors
  [ErrorCode.SYNC001]: 'Shopify sync failed. Please try again or contact support.',
  [ErrorCode.SYNC002]: 'Webhook validation failed. Invalid data received.',
  [ErrorCode.SYNC003]: 'Duplicate order detected. This order has already been processed.',
  [ErrorCode.SYNC004]: 'Inventory sync failed. Please check your connection.',
  
  // System errors
  [ErrorCode.SYS001]: 'Database connection failed. Please try again later.',
  [ErrorCode.SYS002]: 'System error occurred. Please contact support.',
  [ErrorCode.SYS003]: 'Network timeout. Please check your connection and try again.',
  [ErrorCode.SYS004]: 'Configuration error. Please contact support.',
  
  // Validation errors
  [ErrorCode.VAL001]: 'Invalid input data. Please check your input and try again.',
  [ErrorCode.VAL002]: 'Missing required field. Please fill in all required fields.',
  [ErrorCode.VAL003]: 'Data format error. Please check the format of your input.',
  [ErrorCode.VAL004]: 'Business rule violation. This operation is not allowed.',
};

// Recovery actions for different error types
export const ERROR_RECOVERY_ACTIONS: Record<ErrorCode, string[]> = {
  [ErrorCode.ORD001]: ['Verify order ID', 'Search by customer name', 'Check if order exists in another store'],
  [ErrorCode.ORD002]: ['Check current stage', 'Verify stage transition rules', 'Contact supervisor'],
  [ErrorCode.ORD003]: ['View order history', 'Create new order if needed'],
  [ErrorCode.ORD004]: ['Check required fields', 'Validate data format', 'Contact support'],
  
  [ErrorCode.INV001]: ['Restock component', 'Check alternative components', 'Contact supplier'],
  [ErrorCode.INV002]: ['Verify component SKU', 'Check component list', 'Create new component'],
  [ErrorCode.INV003]: ['Retry operation', 'Check permissions', 'Contact support'],
  [ErrorCode.INV004]: ['Retry adjustment', 'Check stock levels', 'Contact support'],
  
  [ErrorCode.AUTH001]: ['Log in again', 'Check credentials', 'Contact administrator'],
  [ErrorCode.AUTH002]: ['Reset password', 'Check email address', 'Contact support'],
  [ErrorCode.AUTH003]: ['Refresh page', 'Log in again'],
  [ErrorCode.AUTH004]: ['Contact administrator', 'Request permission upgrade'],
  
  [ErrorCode.SYNC001]: ['Retry sync', 'Check Shopify connection', 'Contact support'],
  [ErrorCode.SYNC002]: ['Verify webhook configuration', 'Check data format', 'Contact support'],
  [ErrorCode.SYNC003]: ['Check order history', 'Verify order status'],
  [ErrorCode.SYNC004]: ['Check network connection', 'Retry sync', 'Contact support'],
  
  [ErrorCode.SYS001]: ['Refresh page', 'Check network connection', 'Contact support'],
  [ErrorCode.SYS002]: ['Refresh page', 'Try again later', 'Contact support'],
  [ErrorCode.SYS003]: ['Check network connection', 'Try again', 'Contact support'],
  [ErrorCode.SYS004]: ['Contact support', 'Check system status'],
  
  [ErrorCode.VAL001]: ['Check input format', 'Verify required fields', 'Try again'],
  [ErrorCode.VAL002]: ['Fill in missing fields', 'Check form requirements'],
  [ErrorCode.VAL003]: ['Check data format', 'Use correct format', 'Try again'],
  [ErrorCode.VAL004]: ['Check business rules', 'Contact supervisor', 'Verify permissions'],
};

// Error handler utility functions
export const createError = (
  code: ErrorCode,
  message?: string,
  details?: any,
  context?: Record<string, any>
): AppError => {
  const userMessage = message || ERROR_MESSAGES[code];
  return new AppError(code, userMessage, details, context);
};

export const handleError = (error: unknown, context?: Record<string, any>): AppError => {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // If it's a standard Error, wrap it
  if (error instanceof Error) {
    return createError(ErrorCode.SYS002, error.message, error.stack, context);
  }

  // If it's a string, create an AppError
  if (typeof error === 'string') {
    return createError(ErrorCode.SYS002, error, undefined, context);
  }

  // Unknown error type
  return createError(ErrorCode.SYS002, 'An unknown error occurred', error, context);
};

export const logError = (error: AppError, additionalContext?: Record<string, any>) => {
  const logData = {
    ...error.toJSON(),
    ...additionalContext,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('Application Error:', logData);

  // TODO: Send to error tracking service (Sentry, etc.)
  // sendToErrorTracking(logData);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
};

export const getErrorCode = (error: unknown): ErrorCode | null => {
  if (error instanceof AppError) {
    return error.code;
  }
  
  return null;
};

export const getRecoveryActions = (error: unknown): string[] => {
  const code = getErrorCode(error);
  if (code) {
    return ERROR_RECOVERY_ACTIONS[code];
  }
  
  return ['Try again', 'Refresh page', 'Contact support'];
};
