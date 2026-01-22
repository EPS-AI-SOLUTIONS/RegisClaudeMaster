/**
 * Cryptography Module
 * AES-256-GCM encryption/decryption with non-extractable keys
 *
 * Extracted from storage.ts for better separation of concerns
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'regis-matrix-db';
const KEY_STORE_NAME = 'crypto-keys';
const BACKUP_STORE_NAME = 'chat-backups';

/**
 * Log crypto operations in dev mode
 */
export function logCrypto(action: string): void {
  if (import.meta.env.DEV) {
    console.info(`[crypto] ${action}`);
  }
}

// Cache key in memory (non-extractable after generation)
let cachedKey: CryptoKey | null = null;

/**
 * Get or create the IndexedDB database with required stores
 */
export async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(db: IDBPDatabase, oldVersion: number) {
      if (oldVersion < 1 && !db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        db.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Get or generate the master encryption key
 * Key is non-extractable (cannot be exported via XSS)
 */
export async function getKey(): Promise<CryptoKey> {
  // Return cached key if available (fastest path)
  if (cachedKey) {
    return cachedKey;
  }

  const db = await getDb();

  // Try to load existing key from IndexedDB (non-extractable)
  const stored = await db.get(KEY_STORE_NAME, 'master') as { key: CryptoKey } | undefined;
  if (stored?.key) {
    cachedKey = stored.key;
    logCrypto('Loaded existing AES-256 key from IndexedDB');
    return cachedKey as CryptoKey;
  }

  // Generate new non-extractable key (cannot be exported/stolen via XSS)
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // NON-EXTRACTABLE - key cannot be exported
    ['encrypt', 'decrypt']
  );

  // Store in IndexedDB (secure, not accessible via simple XSS)
  await db.put(KEY_STORE_NAME, { id: 'master', key });
  cachedKey = key;
  logCrypto('Generated new non-extractable AES-256 key');
  return key;
}

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  iv: string;
  data: string;
}

/**
 * Encrypt a string payload using AES-256-GCM
 */
export async function encryptPayload(payload: string): Promise<EncryptedPayload> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(payload);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  logCrypto('Encrypted payload');
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

/**
 * Decrypt an encrypted payload using AES-256-GCM
 */
export async function decryptPayload(payload: EncryptedPayload): Promise<string> {
  const key = await getKey();
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.data), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  logCrypto('Decrypted payload');
  return new TextDecoder().decode(decrypted);
}

/**
 * Clear the cached key (for testing/logout)
 */
export function clearCachedKey(): void {
  cachedKey = null;
  logCrypto('Cleared cached key');
}
