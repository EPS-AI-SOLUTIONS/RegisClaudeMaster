/**
 * API Client
 * Handles communication with the Edge backend
 *
 * Refactored: Error handling extracted to http-error-handler.ts
 */

import type { SearchResult } from './types';
import {
  processSSEChunk,
  createStreamState,
  iterateSSEStream,
  type StreamState,
} from './stream-parser';
import {
  handleHttpError,
  normalizeError,
  createTimeoutController,
  RETRYABLE_STATUSES,
} from './http-error-handler';

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
const REQUEST_TIMEOUT = 120000; // 2 minutes

/**
 * Retry a fetch request with exponential backoff
 */
async function requestWithRetry(input: RequestInfo, init: RequestInit): Promise<Response> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(input, init);
      if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
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
export async function executePrompt(
  prompt: string,
  model?: string,
  signal?: AbortSignal
): Promise<ApiResponse> {
  const { signal: mergedSignal, cleanup } = createTimeoutController(REQUEST_TIMEOUT, signal);

  try {
    const response = await requestWithRetry(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, stream: true }),
      signal: mergedSignal,
      credentials: 'include',
    });

    cleanup();

    if (!response.ok) {
      const shouldRetry = await handleHttpError(response);
      if (shouldRetry) {
        return executePrompt(prompt, model, signal);
      }
    }

    return await response.json() as ApiResponse;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    cleanup();
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
 */
export async function executePromptStreaming(
  prompt: string,
  model?: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<StreamingResult> {
  const { signal: mergedSignal, cleanup } = createTimeoutController(REQUEST_TIMEOUT, signal);

  try {
    const response = await fetch(STREAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      signal: mergedSignal,
      credentials: 'include',
    });

    cleanup();

    if (!response.ok) {
      const shouldRetry = await handleHttpError(response);
      if (shouldRetry) {
        return executePromptStreaming(prompt, model, onChunk, signal);
      }
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
    throw normalizeError(error);
  } finally {
    cleanup();
  }
}

/**
 * Execute a prompt with SSE streaming using async iterator
 * Provides more control over stream processing
 */
export async function* streamPrompt(
  prompt: string,
  model?: string,
  signal?: AbortSignal
): AsyncGenerator<string, StreamState, unknown> {
  const { signal: mergedSignal, cleanup } = createTimeoutController(REQUEST_TIMEOUT, signal);

  try {
    const response = await fetch(STREAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      signal: mergedSignal,
      credentials: 'include',
    });

    cleanup();

    if (!response.ok) {
      // For generators, we can't easily retry - just throw
      await handleHttpError(response, false);
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
    throw normalizeError(error);
  } finally {
    cleanup();
  }
}
