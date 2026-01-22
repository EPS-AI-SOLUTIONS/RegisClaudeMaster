/**
 * Storage Module
 * Orchestrates encrypted backup storage system
 *
 * Refactored: Crypto logic moved to crypto.ts, backup logic to backup.ts
 */

import { getKey, logCrypto } from './crypto';

// Re-export backup functions for backward compatibility
export { saveBackup, loadLatestBackup, getBackupCount, clearAllBackups } from './backup';

// Re-export crypto functions for consumers who need them
export { encryptPayload, decryptPayload, getDb, clearCachedKey } from './crypto';
export type { EncryptedPayload } from './crypto';

/**
 * Migrate from old localStorage key storage to secure IndexedDB
 * Call this on app initialization to clean up legacy data
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const OLD_KEY_STORAGE = 'regis-matrix-aes-key';
  const oldKey = localStorage.getItem(OLD_KEY_STORAGE);

  if (oldKey) {
    // Remove insecure localStorage key
    localStorage.removeItem(OLD_KEY_STORAGE);
    logCrypto('Migrated: removed old localStorage key (new secure key will be generated)');

    // Note: Old backups encrypted with the old key will be lost
    // This is acceptable for security - new backups will use the secure key
  }
}

/**
 * Initialize storage system (call on app start)
 * - Migrates from legacy localStorage
 * - Pre-warms the encryption key cache
 */
export async function initializeStorage(): Promise<void> {
  await migrateFromLocalStorage();
  await getKey(); // Pre-warm key cache
  logCrypto('Storage system initialized');
}
