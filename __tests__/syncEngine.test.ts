import { describe, it, expect, beforeEach } from 'vitest';
import { syncEngine } from '../src/services/syncEngine';
import { storageManager } from '../src/services/storageManager';

beforeEach(() => {
  localStorage.clear();
});

describe('syncEngine', () => {
  it('adds and removes queue items', () => {
    const id = syncEngine.addToQueue({ type: 'clockin', action: 'create', data: {} });
    let status = syncEngine.getStatus();
    expect(status.pendingCount).toBe(1);
    syncEngine.removeFromQueue(id);
    status = syncEngine.getStatus();
    expect(status.pendingCount).toBe(0);
  });
});
