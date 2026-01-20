import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveBackup, loadLatestBackup, migrateFromLocalStorage, initializeStorage } from '../../../src/lib/storage';
import type { Message } from '../../../src/lib/types';

// Mock the idb module
vi.mock('idb', () => {
  const mockStore: Record<string, Record<string, unknown>> = {};

  return {
    openDB: vi.fn().mockImplementation(async () => ({
      get: vi.fn().mockImplementation(async (store: string, key: string) => {
        return mockStore[store]?.[String(key)];
      }),
      put: vi.fn().mockImplementation(async (store: string, value: { id: string | number }) => {
        if (!mockStore[store]) {
          mockStore[store] = {};
        }
        mockStore[store][String(value.id)] = value;
      }),
      delete: vi.fn().mockImplementation(async (store: string, key: string | number) => {
        delete mockStore[store]?.[String(key)];
      }),
      getAllKeys: vi.fn().mockImplementation(async (store: string) => {
        return Object.keys(mockStore[store] || {}).map(Number).filter(n => !isNaN(n));
      }),
    })),
    // Expose for test manipulation
    __mockStore: mockStore,
    __resetMockStore: () => {
      Object.keys(mockStore).forEach((key) => delete mockStore[key]);
    },
  };
});

describe('storage', () => {
  beforeEach(async () => {
    // Reset mock store
    const { __resetMockStore } = await import('idb');
    (__resetMockStore as () => void)();

    // Reset localStorage
    localStorage.clear();
  });

  describe('saveBackup', () => {
    it('saves messages to IndexedDB', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2024-01-01T12:00:01Z'),
        },
      ];

      await saveBackup(messages);

      // Verify data was saved (through mock)
      const { __mockStore } = await import('idb');
      const store = (__mockStore as Record<string, Record<string, unknown>>)['chat-backups'];
      expect(store).toBeDefined();
      expect(Object.keys(store).length).toBeGreaterThan(0);
    });

    it('handles empty messages array', async () => {
      await expect(saveBackup([])).resolves.not.toThrow();
    });

    it('handles messages with sources', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Here are the results',
          timestamp: new Date(),
          sources: [
            { title: 'Source 1', link: 'https://example.com/1' },
            { title: 'Source 2', link: 'https://example.com/2' },
          ],
          modelUsed: 'claude-3',
        },
      ];

      await expect(saveBackup(messages)).resolves.not.toThrow();
    });
  });

  describe('loadLatestBackup', () => {
    it('returns null when no backups exist', async () => {
      const result = await loadLatestBackup();
      expect(result).toBeNull();
    });

    it('loads the latest backup', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ];

      // Save backup first
      await saveBackup(messages);

      // Load it back
      const loaded = await loadLatestBackup();

      expect(loaded).toBeTruthy();
      expect(loaded).toHaveLength(1);
      expect(loaded![0].content).toBe('Test message');
      expect(loaded![0].timestamp).toBeInstanceOf(Date);
    });

    it('converts timestamp strings to Date objects', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ];

      await saveBackup(messages);
      const loaded = await loadLatestBackup();

      expect(loaded![0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('migrateFromLocalStorage', () => {
    it('removes old localStorage key if present', async () => {
      localStorage.setItem('regis-matrix-aes-key', 'old-insecure-key');

      await migrateFromLocalStorage();

      expect(localStorage.getItem('regis-matrix-aes-key')).toBeNull();
    });

    it('does nothing if no old key exists', async () => {
      await expect(migrateFromLocalStorage()).resolves.not.toThrow();
    });
  });

  describe('initializeStorage', () => {
    it('runs migration and warms up key cache', async () => {
      localStorage.setItem('regis-matrix-aes-key', 'old-key');

      await expect(initializeStorage()).resolves.not.toThrow();

      // Old key should be removed
      expect(localStorage.getItem('regis-matrix-aes-key')).toBeNull();
    });

    it('can be called multiple times safely', async () => {
      await initializeStorage();
      await initializeStorage();
      await initializeStorage();

      // Should not throw
    });
  });

  describe('backup rotation', () => {
    it('keeps maximum 10 backups', async () => {
      const messages: Message[] = [
        { id: 'msg', role: 'user', content: 'Test', timestamp: new Date() },
      ];

      // Save 12 backups
      for (let i = 0; i < 12; i++) {
        await saveBackup(messages);
        // Small delay to ensure different timestamps
        await new Promise((r) => setTimeout(r, 10));
      }

      const { __mockStore } = await import('idb');
      const store = (__mockStore as Record<string, Record<string, unknown>>)['chat-backups'];

      // Should have at most 10 backups
      expect(Object.keys(store || {}).length).toBeLessThanOrEqual(10);
    });
  });
});
