import { describe, it, expect, beforeEach } from 'vitest';
import { storageManager } from '../src/services/storageManager';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('storageManager', () => {
  it('stores and retrieves data with backup', () => {
    const result = storageManager.set('demo', { a: 1 });
    expect(result).toBe(true);
    const value = storageManager.get('demo');
    expect(value).toEqual({ a: 1 });
    // backup should exist
    const backupKeys = Object.keys(localStorage).filter(k => k.startsWith('backup_demo_'));
    expect(backupKeys.length).toBeGreaterThan(0);
  });

  it('encrypts and decrypts data', async () => {
    const key = crypto.getRandomValues(new Uint8Array(16));
    storageManager.setEncryptionKey(btoa(String.fromCharCode(...key)));
    await storageManager.set('secret', { v: 2 }, { encrypt: true });
    const val = await storageManager.get('secret');
    expect(val).toEqual({ v: 2 });
  });
});
