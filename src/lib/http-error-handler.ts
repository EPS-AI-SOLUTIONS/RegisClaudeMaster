/**
 * HTTP Error Handler
 * Centralized handling of HTTP response errors
 * Eliminates duplication across api-client.ts functions
 */

export type HttpErrorCode = 'AUTH_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'UNKNOWN';

export interface HttpErrorResult {
  shouldRefreshAuth: boolean;
  errorCode: HttpErrorCode;
  errorMessage: string;
}

/**
 * Standard retryable HTTP status codes
 */
export const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Analyze HTTP response and determine error handling action
 */
export function analyzeHttpError(response: Response): HttpErrorResult {
  switch (response.status) {
    case 401:
      return {
        shouldRefreshAuth: true,
        errorCode: 'AUTH_ERROR',
        errorMessage: 'Authentication required',
      };
    case 429:
      return {
        shouldRefreshAuth: false,
        errorCode: 'RATE_LIMIT',
        errorMessage: 'Too many requests, please slow down',
      };
    case 504:
      return {
        shouldRefreshAuth: false,
        errorCode: 'TIMEOUT',
        errorMessage: 'Request timed out',
      };
    default:
      return {
        shouldRefreshAuth: false,
        errorCode: 'UNKNOWN',
        errorMessage: `HTTP Error ${response.status}`,
      };
  }
}

/**
 * Refresh the auth session
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Logout the user (called when refresh fails)
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore logout errors
  }
}

/**
 * Handle HTTP error response with optional auth refresh
 * Returns true if the request should be retried (after successful auth refresh)
 *
 * @throws Error with appropriate error code if not recoverable
 */
export async function handleHttpError(
  response: Response,
  allowAuthRefresh: boolean = true
): Promise<boolean> {
  const result = analyzeHttpError(response);

  // Try to refresh auth if allowed
  if (result.shouldRefreshAuth && allowAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return true; // Signal to retry the request
    }
    // Refresh failed - logout and throw
    await logout();
    throw new Error('AUTH_ERROR');
  }

  throw new Error(result.errorCode);
}

/**
 * Check if an error is an AbortError (timeout/cancellation)
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Wrap any error into a standardized error code
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    if (isAbortError(error)) {
      return new Error('TIMEOUT');
    }
    return error;
  }
  return new Error('UNKNOWN');
}

/**
 * Create an AbortController with timeout
 * Returns controller and cleanup function
 */
export function createTimeoutController(
  timeoutMs: number,
  existingSignal?: AbortSignal
): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = existingSignal
    ? AbortSignal.any([existingSignal, controller.signal])
    : controller.signal;

  return {
    signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}
