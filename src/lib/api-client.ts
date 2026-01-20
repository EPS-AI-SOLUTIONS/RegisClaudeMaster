import type { SearchResult } from './types';
import {
  processSSEChunk,
  createStreamState,
  iterateSSEStream,
  type StreamState,
} from './stream-parser';

export interface ApiResponse {
  success: boolean;
  response: string;
  sources: SearchResult[];
  model_used: string;
  grounding_performed: boolean;
}

export interface ApiError {
  error: string;
}

export interface StreamingResult {
  response: string;
  modelUsed: string;
  sources: SearchResult[];
  groundingPerformed: boolean;
}

const API_ENDPOINT = '/api/execute';
const STREAM_ENDPOINT = '/api/stream';
const MAX_RETRIES = 3;

const retryableStatuses = new Set([429, 504]);

async function refreshSession(): Promise<boolean> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  return response.ok;
}

async function requestWithRetry(input: RequestInfo, init: RequestInit): Promise<Response> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(input, init);
      if (response.ok || !retryableStatuses.has(response.status)) {
        return response;
      }
      lastError = new Error(`Retryable status: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }

    attempt += 1;
    const delay = Math.min(1000 * 2 ** attempt, 3000) + Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError ?? new Error('Unknown retry error');
}

/**
 * Execute a prompt against the Edge backend
 */
export async function executePrompt(prompt: string, model?: string, signal?: AbortSignal): Promise<ApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const mergedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const response = await requestWithRetry(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model, stream: true }),
      signal: mergedSignal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return executePrompt(prompt, model, signal);
        }
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
        throw new Error('AUTH_ERROR');
      }
      if (response.status === 504) {
        throw new Error('TIMEOUT');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }

      const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
    throw new Error('UNKNOWN');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health check for the API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Execute a prompt with SSE streaming support
 * Progressively sends chunks to the onChunk callback as they arrive
 *
 * @param prompt - The user prompt to send
 * @param model - Optional model ID to use
 * @param onChunk - Callback function called with each text chunk
 * @param signal - Optional AbortSignal for cancellation
 * @returns Final streaming result with full response and metadata
 */
export async function executePromptStreaming(
  prompt: string,
  model?: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<StreamingResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const mergedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const response = await fetch(STREAM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model }),
      signal: mergedSignal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return executePromptStreaming(prompt, model, onChunk, signal);
        }
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
        throw new Error('AUTH_ERROR');
      }
      if (response.status === 504) {
        throw new Error('TIMEOUT');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }

      const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Process the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let state = createStreamState();
    let streamActive = true;

    while (streamActive) {
      const { done, value } = await reader.read();

      if (done) {
        streamActive = false;
        continue;
      }

      const chunk = decoder.decode(value, { stream: true });
      state = processSSEChunk(state, chunk, onChunk);

      if (state.error) {
        throw new Error(state.error);
      }

      if (state.isDone) {
        streamActive = false;
      }
    }

    reader.releaseLock();

    return {
      response: state.fullResponse,
      modelUsed: state.modelUsed || 'unknown',
      sources: state.sources,
      groundingPerformed: state.groundingPerformed,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
    throw new Error('UNKNOWN');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute a prompt with SSE streaming using async iterator
 * Provides more control over stream processing
 *
 * @param prompt - The user prompt to send
 * @param model - Optional model ID to use
 * @param signal - Optional AbortSignal for cancellation
 * @yields Text chunks as they arrive from the stream
 * @returns Final stream state with metadata
 */
export async function* streamPrompt(
  prompt: string,
  model?: string,
  signal?: AbortSignal
): AsyncGenerator<string, StreamState, unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const mergedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const response = await fetch(STREAM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model }),
      signal: mergedSignal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('AUTH_ERROR');
      }
      if (response.status === 504) {
        throw new Error('TIMEOUT');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }

      const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const iterator = iterateSSEStream(reader);

    // Yield chunks from the iterator
    let result: IteratorResult<string, StreamState> = await iterator.next();
    while (!result.done) {
      yield result.value as string;
      result = await iterator.next();
    }

    // Return the final state
    return result.value as StreamState;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
    throw new Error('UNKNOWN');
  } finally {
    clearTimeout(timeoutId);
  }
}
