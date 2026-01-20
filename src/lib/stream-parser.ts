import type { SearchResult } from './types';

/**
 * SSE Chunk Event - contains partial response text
 */
export interface SSEChunkEvent {
  chunk: string;
  done: false;
}

/**
 * SSE Done Event - final event with metadata
 */
export interface SSEDoneEvent {
  done: true;
  model_used: string;
  sources: SearchResult[];
  grounding_performed: boolean;
}

/**
 * SSE Error Event - error during streaming
 */
export interface SSEErrorEvent {
  error: string;
}

/**
 * Union type for all possible SSE events
 */
export type SSEEvent = SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;

/**
 * Result of parsing an SSE line
 */
export interface ParsedSSE {
  chunk?: string;
  done: boolean;
  model_used?: string;
  sources?: SearchResult[];
  grounding_performed?: boolean;
  error?: string;
}

/**
 * Parse a single SSE line into a structured result
 * SSE format: "data: {JSON}\n\n"
 *
 * @param line - Raw SSE line (including "data: " prefix)
 * @returns Parsed SSE result
 */
export function parseSSE(line: string): ParsedSSE {
  // Handle empty lines (SSE uses double newlines as event separators)
  if (!line.trim()) {
    return { done: false };
  }

  // Handle comment lines (SSE spec allows comments starting with :)
  if (line.startsWith(':')) {
    return { done: false };
  }

  // Handle event type declarations (we only care about data)
  if (!line.startsWith('data: ')) {
    return { done: false };
  }

  // Extract JSON payload
  const jsonStr = line.slice(6).trim();

  // Handle special [DONE] marker (used by some providers)
  if (jsonStr === '[DONE]') {
    return { done: true };
  }

  // Handle empty data
  if (!jsonStr) {
    return { done: false };
  }

  try {
    const event = JSON.parse(jsonStr) as SSEEvent;

    // Handle error events
    if ('error' in event) {
      return {
        done: false,
        error: event.error,
      };
    }

    // Handle done events
    if (event.done === true) {
      return {
        done: true,
        model_used: event.model_used,
        sources: event.sources,
        grounding_performed: event.grounding_performed,
      };
    }

    // Handle chunk events
    if (event.done === false && 'chunk' in event) {
      return {
        done: false,
        chunk: event.chunk,
      };
    }

    // Unknown format
    return { done: false };
  } catch {
    // Invalid JSON - return empty result
    return { done: false };
  }
}

/**
 * Stream state for tracking buffer and parsed events
 */
export interface StreamState {
  buffer: string;
  fullResponse: string;
  modelUsed: string | null;
  sources: SearchResult[];
  groundingPerformed: boolean;
  error: string | null;
  isDone: boolean;
}

/**
 * Create initial stream state
 */
export function createStreamState(): StreamState {
  return {
    buffer: '',
    fullResponse: '',
    modelUsed: null,
    sources: [],
    groundingPerformed: false,
    error: null,
    isDone: false,
  };
}

/**
 * Process a chunk of SSE data and update state
 *
 * @param state - Current stream state
 * @param chunk - Raw SSE data chunk
 * @param onChunk - Callback for each text chunk
 * @returns Updated stream state
 */
export function processSSEChunk(
  state: StreamState,
  chunk: string,
  onChunk?: (text: string) => void
): StreamState {
  const newState = { ...state };
  newState.buffer += chunk;

  // Split by double newlines (SSE event separator)
  const events = newState.buffer.split('\n\n');

  // Keep incomplete event in buffer
  newState.buffer = events.pop() || '';

  // Process complete events
  for (const eventBlock of events) {
    const lines = eventBlock.split('\n');
    for (const line of lines) {
      const parsed = parseSSE(line);

      if (parsed.error) {
        newState.error = parsed.error;
        newState.isDone = true;
        return newState;
      }

      if (parsed.chunk) {
        newState.fullResponse += parsed.chunk;
        onChunk?.(parsed.chunk);
      }

      if (parsed.done) {
        newState.isDone = true;
        if (parsed.model_used) {
          newState.modelUsed = parsed.model_used;
        }
        if (parsed.sources) {
          newState.sources = parsed.sources;
        }
        if (parsed.grounding_performed !== undefined) {
          newState.groundingPerformed = parsed.grounding_performed;
        }
      }
    }
  }

  return newState;
}

/**
 * Async iterator for processing SSE stream
 * Yields text chunks as they arrive
 *
 * @param reader - ReadableStreamDefaultReader for the SSE stream
 * @yields Text chunks from the stream
 * @returns Final stream state with metadata
 */
export async function* iterateSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string, StreamState, unknown> {
  const decoder = new TextDecoder();
  let state = createStreamState();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const chunks: string[] = [];

      state = processSSEChunk(state, chunk, (text) => {
        chunks.push(text);
      });

      for (const textChunk of chunks) {
        yield textChunk;
      }

      if (state.isDone) {
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return state;
}
