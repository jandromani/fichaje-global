import { storageManager } from './storageManager';
import { STORAGE_KEYS, ClockIn } from '../types';

interface MaintenanceLog {
  timestamp: string;
  message: string;
}

class MaintenanceAgent {
  private dailyMs = 24 * 60 * 60 * 1000;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    this.runTasks();
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.runTasks(), this.dailyMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private runTasks() {
    const lastRun = storageManager.get<string>('wmapp_last_maintenance');
    const today = new Date().toDateString();
    if (lastRun && new Date(lastRun).toDateString() === today) return;

    this.rotateOldClockIns();
    this.compressLargeModels();
    this.runHealthCheck();
    this.removeObsoleteKeys();

    storageManager.set('wmapp_last_maintenance', new Date().toISOString());
  }

  private rotateOldClockIns() {
    const data = storageManager.get<ClockIn[]>(STORAGE_KEYS.CLOCKINS, []);
    const limit = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = data.filter(c => new Date(c.timestamp).getTime() >= limit);
    if (filtered.length !== data.length) {
      storageManager.set(STORAGE_KEYS.CLOCKINS, filtered);
      this.log(`Removed ${data.length - filtered.length} old clock-ins`);
    }
  }

  private compressLargeModels() {
    const info = storageManager.getStorageInfo();
    info.items.forEach(item => {
      if (item.size > 100 * 1024 && item.metadata && !item.metadata.compressed) {
        const data = storageManager.get(item.key);
        if (data) {
          const success = storageManager.set(item.key, data, { compress: true });
          if (success) {
            this.log(`Compressed ${item.key}`);
          }
        }
      }
    });
  }

  private runHealthCheck() {
    // Simple placeholder health check
    const required = [STORAGE_KEYS.USERS, STORAGE_KEYS.COMPANIES, STORAGE_KEYS.STATIONS];
    required.forEach(key => {
      if (!storageManager.hasKey(key)) {
        this.log(`HealthCheck warning: missing ${key}`);
      }
    });
    this.log('HealthCheck complete');
  }

  private removeObsoleteKeys() {
    const valid = new Set(Object.values(STORAGE_KEYS));
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!valid.has(key) && !key.startsWith('backup_') && !key.startsWith('full_backup_')) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => {
      localStorage.removeItem(k);
      this.log(`Removed obsolete key ${k}`);
    });
  }

  private log(message: string) {
    console.log('[Maintenance]', message);
    const logs = storageManager.get<MaintenanceLog[]>('wmapp_maintenance_log', []);
    logs.push({ timestamp: new Date().toISOString(), message });
    storageManager.set('wmapp_maintenance_log', logs, { compress: false });
  }

  getLogs(): MaintenanceLog[] {
    return storageManager.get<MaintenanceLog[]>('wmapp_maintenance_log', []) || [];
  }
}

export const maintenanceAgent = new MaintenanceAgent();
