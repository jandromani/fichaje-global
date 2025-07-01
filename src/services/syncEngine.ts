import { APP_CONFIG } from '../types';
import { storageManager } from './storageManager';
import { syncBridge } from './syncBridge';
import type { SyncQueueItem, SyncStatus } from '../types';

// ==========================================
// MOTOR DE SINCRONIZACIÓN OFFLINE
// ==========================================

interface SyncConfig {
  enabled: boolean;
  interval: number;
  maxRetries: number;
  retryDelayBase: number;
  retryDelayMax: number;
  batchSize: number;
  priority: {
    clockin: number;
    leave: number;
    user: number;
    notification: number;
  };
}

interface SyncLog {
  timestamp: string;
  operation: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: unknown;
}

class SyncEngine {
  private config: SyncConfig = {
    enabled: true,
    interval: APP_CONFIG.SYNC_INTERVAL,
    maxRetries: APP_CONFIG.MAX_SYNC_RETRIES,
    retryDelayBase: 1000, // 1 second
    retryDelayMax: 60000, // 1 minute
    batchSize: 10,
    priority: {
      clockin: 1, // Highest priority
      leave: 2,
      user: 3,
      notification: 4 // Lowest priority
    }
  };

  private typeToStorageKey: Record<SyncQueueItem['type'], string> = {
    clockin: 'wmapp_clockins',
    leave: 'wmapp_leave_requests',
    user: 'wmapp_users',
    notification: 'wmapp_notifications'
  };

  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private logs: SyncLog[] = [];
  private maxLogs = 1000;

  // ==========================================
  // MÉTODOS PÚBLICOS
  // ==========================================

  start(): void {
    if (!this.config.enabled) {
      this.log('Sync engine disabled', 'warning');
      return;
    }

    this.stop(); // Stop any existing interval

    this.log('Sync engine started', 'success');
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.config.interval);

    // Process immediately on start
    this.processQueue();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log('Sync engine stopped', 'success');
    }
  }

  addToQueue(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'priority'>): string {
    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      attempts: 0,
      priority: this.config.priority[item.type] || 99,
      maxAttempts: this.config.maxRetries
    };

    const queue = this.getQueue();
    queue.push(queueItem);
    this.saveQueue(queue);

    this.log(`Added to sync queue: ${item.type}/${item.action}`, 'success', queueItem);
    this.notifyListeners();

    return queueItem.id;
  }

  removeFromQueue(id: string): boolean {
    const queue = this.getQueue();
    const initialLength = queue.length;
    const filteredQueue = queue.filter(item => item.id !== id);
    
    if (filteredQueue.length !== initialLength) {
      this.saveQueue(filteredQueue);
      this.log(`Removed from sync queue: ${id}`, 'success');
      this.notifyListeners();
      return true;
    }

    return false;
  }

  getStatus(): SyncStatus {
    const queue = this.getQueue();
    const errorCount = queue.filter(item => item.error).length;

    return {
      isOnline: navigator.onLine,
      lastSync: storageManager.get('last_sync_timestamp'),
      pendingCount: queue.length,
      errorCount,
      isProcessing: this.isProcessing,
      queue: queue.slice(0, 10) // Return only first 10 items for UI
    };
  }

  clearQueue(): void {
    this.saveQueue([]);
    this.log('Sync queue cleared', 'success');
    this.notifyListeners();
  }

  clearErrors(): void {
    const queue = this.getQueue();
    const cleanQueue = queue.filter(item => !item.error);
    this.saveQueue(cleanQueue);
    this.log('Sync errors cleared', 'success');
    this.notifyListeners();
  }

  forceSync(): Promise<void> {
    return this.processQueue(true);
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  exportLogs(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.log('Sync logs cleared', 'success');
  }

  // ==========================================
  // PROCESAMIENTO DE COLA
  // ==========================================

  private async processQueue(force = false): Promise<void> {
    if (this.isProcessing && !force) {
      return;
    }

    if (!navigator.onLine && !force) {
      this.log('Offline - skipping sync', 'warning');
      return;
    }

    this.isProcessing = true;
    this.notifyListeners();

    try {
      const queue = this.getQueue();
      const readyItems = this.getReadyItems(queue);

      if (readyItems.length === 0) {
        this.log('No items ready for sync', 'success');
        return;
      }

      this.log(`Processing ${readyItems.length} sync items`, 'success');

      // Process in batches
      const batches = this.createBatches(readyItems);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Update last sync timestamp
      storageManager.set('last_sync_timestamp', new Date().toISOString());
      
    } catch (error) {
      this.log('Queue processing failed', 'error', error);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  private getReadyItems(queue: SyncQueueItem[]): SyncQueueItem[] {
    const now = Date.now();
    
    return queue
      .filter(item => {
        // Skip if max attempts reached
        if (item.attempts >= item.maxAttempts) {
          return false;
        }

        // Skip if waiting for retry
        if (item.nextRetry && new Date(item.nextRetry).getTime() > now) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by priority, then by creation order
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.id.localeCompare(b.id);
      });
  }

  private createBatches(items: SyncQueueItem[]): SyncQueueItem[][] {
    const batches: SyncQueueItem[][] = [];
    
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      batches.push(items.slice(i, i + this.config.batchSize));
    }

    return batches;
  }

  private async processBatch(batch: SyncQueueItem[]): Promise<void> {
    const promises = batch.map(item => this.processItem(item));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      this.log('Batch processing error', 'error', error);
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    try {
      this.log(`Processing sync item: ${item.type}/${item.action}`, 'success', item);

      const result = await this.performSync(item);

      if (result.conflict) {
        this.log(`Conflict detected for ${item.type}/${item.action}`, 'warning');
        const queue = this.getQueue();
        const index = queue.findIndex(q => q.id === item.id);
        if (index > -1) {
          queue[index].error = 'conflict';
          this.saveQueue(queue);
        }
        return;
      }

      if (result.success) {
        this.removeFromQueue(item.id);
        if (item.action !== 'delete') {
          this.updateEntityStatus(item.type, item.data.id, 'synced');
        }
        this.log(`Sync successful: ${item.type}/${item.action}`, 'success');
      } else {
        throw new Error('Sync failed');
      }

    } catch (error) {
      await this.handleSyncError(item, error);
    }
  }

  private async handleSyncError(item: SyncQueueItem, error: unknown): Promise<void> {
    const queue = this.getQueue();
    const queueIndex = queue.findIndex(q => q.id === item.id);
    
    if (queueIndex === -1) return;

    const updatedItem = { ...queue[queueIndex] };
    updatedItem.attempts += 1;
    updatedItem.error = error.message || 'Unknown error';

    // Calculate next retry time with exponential backoff + jitter
    const isConflict = error.message?.toLowerCase().includes('conflict');
    if (isConflict && item.action !== 'delete') {
      this.updateEntityStatus(item.type, item.data.id, 'conflicted');
    }

    if (updatedItem.attempts < updatedItem.maxAttempts) {
      const delay = Math.min(
        this.config.retryDelayBase * Math.pow(2, updatedItem.attempts - 1),
        this.config.retryDelayMax
      );
      
      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() - 0.5);
      const finalDelay = delay + jitter;
      
      updatedItem.nextRetry = new Date(Date.now() + finalDelay).toISOString();
      
      this.log(`Sync failed, retry in ${Math.round(finalDelay / 1000)}s: ${item.type}/${item.action}`, 'warning', error);
    } else {
      this.log(`Sync failed permanently: ${item.type}/${item.action}`, 'error', error);
      if (item.action !== 'delete') {
        const status = error.message?.toLowerCase().includes('conflict') ? 'conflicted' : 'error';
        this.updateEntityStatus(item.type, item.data.id, status as any);
      }
    }

    queue[queueIndex] = updatedItem;
    this.saveQueue(queue);
  }

  // ==========================================
  // MÉTODOS DE SIMULACIÓN (REEMPLAZAR EN PRODUCCIÓN)
  // ==========================================

  private async simulateSync(item: SyncQueueItem): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Simulate occasional failures for testing
    const failureRate = 0.1; // 10% failure rate
    const conflictRate = 0.05; // 5% conflict rate
    const r = Math.random();
    if (r < conflictRate) {
      throw new Error('Conflict');
    }
    if (r < conflictRate + failureRate) {
      throw new Error('Simulated network error');
    }
  }

  // ==========================================
  // MÉTODOS DE UTILIDAD
  // ==========================================

  private getQueue(): SyncQueueItem[] {
    return storageManager.get('sync_queue', []);
  }

  private saveQueue(queue: SyncQueueItem[]): void {
    storageManager.set('sync_queue', queue);
  }

  private updateEntityStatus(type: SyncQueueItem['type'], id: string, status: 'synced' | 'error' | 'conflicted'): void {
    const key = this.typeToStorageKey[type];
    if (!key) return;
    const items = storageManager.get<any[]>(key, []);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;
    items[index].syncStatus = status;
    storageManager.set(key, items);
  }

  exportPendingQueue(): string {
    const queue = this.getQueue();
    return JSON.stringify({ exportedAt: new Date().toISOString(), pending: queue }, null, 2);
  }

  downloadPendingSync(): void {
    if (typeof window === 'undefined') return;
    const data = this.exportPendingQueue();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-sync-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, status: SyncLog['status'], data?: unknown): void {
    const logEntry: SyncLog = {
      timestamp: new Date().toISOString(),
      operation: 'sync',
      status,
      message,
      data
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = status === 'error' ? 'error' : status === 'warning' ? 'warn' : 'log';
      console[logMethod](`[SyncEngine] ${message}`, data || '');
    }
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[SyncEngine] Listener error:', error);
      }
    });
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();

// Auto-start sync engine
if (typeof window !== 'undefined') {
  syncEngine.start();
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    syncEngine.forceSync();
  });

  window.addEventListener('beforeunload', () => {
    syncEngine.stop();
  });
}