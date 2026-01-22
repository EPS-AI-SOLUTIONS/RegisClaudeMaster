/**
 * Backup Module
 * Handles encrypted chat backup storage in IndexedDB
 *
 * Extracted from storage.ts for better separation of concerns
 */

import type { Message } from './types';
import { getDb, encryptPayload, decryptPayload, logCrypto } from './crypto';

const BACKUP_STORE_NAME = 'chat-backups';
const MAX_BACKUPS = 10;

/**
 * Save messages as an encrypted backup
 * Automatically prunes old backups beyond MAX_BACKUPS
 */
export async function saveBackup(messages: Message[]): Promise<void> {
  const db = await getDb();
  const payload = JSON.stringify({ messages, createdAt: new Date().toISOString() });
  const encrypted = await encryptPayload(payload);

  const id = Date.now();
  await db.put(BACKUP_STORE_NAME, { id, ...encrypted });

  // Prune old backups
  const keys = await db.getAllKeys(BACKUP_STORE_NAME);
  const excess = keys.length - MAX_BACKUPS;
  if (excess > 0) {
    const sorted = keys.sort();
    await Promise.all(sorted.slice(0, excess).map((key) => db.delete(BACKUP_STORE_NAME, key)));
  }

  logCrypto(`Saved backup (${messages.length} messages)`);
}

/**
 * Load the most recent encrypted backup
 * Returns null if no backups exist
 */
export async function loadLatestBackup(): Promise<Message[] | null> {
  const db = await getDb();
  const keys = await db.getAllKeys(BACKUP_STORE_NAME);

  if (keys.length === 0) {
    return null;
  }

  const sortedKeys = keys.sort();
  const latestKey = sortedKeys[sortedKeys.length - 1];

  if (latestKey === undefined) {
    return null;
  }

  const record = await db.get(BACKUP_STORE_NAME, latestKey);
  if (!record) {
    return null;
  }

  try {
    const decrypted = await decryptPayload({ iv: record.iv, data: record.data });
    const parsed = JSON.parse(decrypted) as { messages: Message[] };

    // Convert timestamp strings back to Date objects
    return parsed.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    }));
  } catch (error) {
    console.warn('Failed to decrypt backup:', error);
    return null;
  }
}

/**
 * Get count of stored backups
 */
export async function getBackupCount(): Promise<number> {
  const db = await getDb();
  const keys = await db.getAllKeys(BACKUP_STORE_NAME);
  return keys.length;
}

/**
 * Clear all backups (for testing or user request)
 */
export async function clearAllBackups(): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeys(BACKUP_STORE_NAME);
  await Promise.all(keys.map((key) => db.delete(BACKUP_STORE_NAME, key)));
  logCrypto('Cleared all backups');
}
