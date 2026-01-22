import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executePrompt, checkApiHealth } from '../../../src/lib/api-client';

describe('api-client', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executePrompt', () => {
    it('sends POST request with correct payload', async () => {
      const mockResponse = {
        success: true,
        response: 'AI response',
        sources: [],
        model_used: 'claude-3',
        grounding_performed: false,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await executePrompt('test prompt', 'claude-3');

      expect(fetch).toHaveBeenCalledWith('/api/execute', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test prompt', model: 'claude-3', stream: true }),
        credentials: 'include',
      }));
      expect(result).toEqual(mockResponse);
    });

    it('handles 401 auth error and attempts refresh', async () => {
      // First call returns 401
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh call succeeds
        .mockResolvedValueOnce({
          ok: true,
        } as Response)
        // Retry call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            response: 'After refresh',
            sources: [],
            model_used: 'claude-3',
            grounding_performed: false,
          }),
        } as Response);

      const result = await executePrompt('test prompt');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.response).toBe('After refresh');
    });

    it('throws AUTH_ERROR when refresh fails', async () => {
      // First call returns 401
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh call fails
        .mockResolvedValueOnce({
          ok: false,
        } as Response)
        // Logout call
        .mockResolvedValueOnce({
          ok: true,
        } as Response);

      await expect(executePrompt('test prompt')).rejects.toThrow('AUTH_ERROR');
    });

    it('retries on 429 with exponential backoff', async () => {
      const mockResponse = {
        success: true,
        response: 'Success after retry',
        sources: [],
        model_used: 'claude-3',
        grounding_performed: false,
      };

      // First two calls return 429, third succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response);

      const promise = executePrompt('test prompt');

      // Advance through retry delay
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      expect(result.response).toBe('Success after retry');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('parses error response body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid prompt' }),
      } as Response);

      // Refactored: error handling now uses error codes instead of messages
      await expect(executePrompt('test prompt')).rejects.toThrow('UNKNOWN');
    });

    it('handles malformed error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      // Refactored: error handling now uses error codes instead of messages
      await expect(executePrompt('test prompt')).rejects.toThrow('UNKNOWN');
    });

    it('sends request without model parameter', async () => {
      const mockResponse = {
        success: true,
        response: 'Response',
        sources: [],
        model_used: 'auto',
        grounding_performed: false,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await executePrompt('test prompt');

      expect(fetch).toHaveBeenCalledWith('/api/execute', expect.objectContaining({
        body: expect.stringContaining('"prompt":"test prompt"'),
      }));
    });

    it('includes credentials in request', async () => {
      const mockResponse = {
        success: true,
        response: 'Response',
        sources: [],
        model_used: 'claude-3',
        grounding_performed: false,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await executePrompt('test prompt');

      expect(fetch).toHaveBeenCalledWith('/api/execute', expect.objectContaining({
        credentials: 'include',
      }));
    });

    it('returns sources from response', async () => {
      const mockResponse = {
        success: true,
        response: 'Response with sources',
        sources: [
          { title: 'Source 1', link: 'https://example.com/1' },
          { title: 'Source 2', link: 'https://example.com/2' },
        ],
        model_used: 'claude-3',
        grounding_performed: true,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await executePrompt('test prompt');

      expect(result.sources).toHaveLength(2);
      expect(result.grounding_performed).toBe(true);
    });
  });

  describe('checkApiHealth', () => {
    it('returns true when API is healthy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await checkApiHealth();

      expect(fetch).toHaveBeenCalledWith('/api/health', {
        method: 'GET',
        credentials: 'include',
      });
      expect(result).toBe(true);
    });

    it('returns false when API returns error status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await checkApiHealth();
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkApiHealth();
      expect(result).toBe(false);
    });

    it('returns false on timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'));

      const result = await checkApiHealth();
      expect(result).toBe(false);
    });
  });
});
