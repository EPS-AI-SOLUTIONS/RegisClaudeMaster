import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

// Mock crypto.subtle for Node environment
const mockCryptoKey = {} as CryptoKey;

const mockSubtle = {
  generateKey: vi.fn().mockResolvedValue(mockCryptoKey),
  encrypt: vi.fn().mockImplementation(async (_algo, _key, data: ArrayBuffer) => {
    // Simple mock encryption - just return the data
    return data;
  }),
  decrypt: vi.fn().mockImplementation(async (_algo, _key, data: ArrayBuffer) => {
    // Simple mock decryption - just return the data
    return data;
  }),
};

Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
      if (array) {
        const uint8 = new Uint8Array(array.buffer);
        for (let i = 0; i < uint8.length; i++) {
          uint8[i] = Math.floor(Math.random() * 256);
        }
      }
      return array;
    },
  },
});

// Mock IndexedDB
const mockIDBData: Record<string, Record<string, unknown>> = {};

vi.mock('idb', () => ({
  openDB: vi.fn().mockImplementation(async (name: string) => ({
    get: vi.fn().mockImplementation(async (store: string, key: string) => {
      return mockIDBData[`${name}-${store}`]?.[key];
    }),
    put: vi.fn().mockImplementation(async (store: string, value: { id: string }) => {
      if (!mockIDBData[`${name}-${store}`]) {
        mockIDBData[`${name}-${store}`] = {};
      }
      mockIDBData[`${name}-${store}`][value.id] = value;
    }),
    delete: vi.fn().mockImplementation(async (store: string, key: string) => {
      delete mockIDBData[`${name}-${store}`]?.[key];
    }),
    getAllKeys: vi.fn().mockImplementation(async (store: string) => {
      return Object.keys(mockIDBData[`${name}-${store}`] || {});
    }),
  })),
}));

// Mock fetch
globalThis.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
      PROD: false,
    },
  },
});

// Clean up between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.store = {};
  Object.keys(mockIDBData).forEach((key) => delete mockIDBData[key]);
});

afterEach(() => {
  vi.restoreAllMocks();
});
