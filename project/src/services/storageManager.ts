import { APP_CONFIG, STORAGE_KEYS } from '../types';

// ==========================================
// GESTIÓN CENTRALIZADA DE LOCALSTORAGE
// ==========================================

interface StorageConfig {
  compress: boolean;
  encrypt: boolean;
  validate: boolean;
  backup: boolean;
}

interface StorageMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  compressed: boolean;
  checksum?: string;
}

class StorageManager {
  private config: StorageConfig = {
    compress: true,
    encrypt: false,
    validate: true,
    backup: true
  };

  private compressionThreshold = 50 * 1024; // 50KB
  private maxRetries = 3;

  // ==========================================
  // MÉTODOS PRINCIPALES
  // ==========================================

  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);
      
      if (this.hasMetadata(parsed)) {
        const { data, metadata } = parsed;
        
        if (this.config.validate && !this.validateData(data, metadata)) {
          console.warn(`[StorageManager] Data validation failed for key: ${key}`);
          return defaultValue;
        }

        return metadata.compressed ? this.decompress(data) : data;
      }

      return parsed;
    } catch (error) {
      console.error(`[StorageManager] Error reading key ${key}:`, error);
      return defaultValue;
    }
  }

  set<T>(key: string, value: T, config?: Partial<StorageConfig>): boolean {
    const finalConfig = { ...this.config, ...config };
    
    try {
      let processedValue = value;
      let compressed = false;

      // Aplicar compresión si es necesario
      const serialized = JSON.stringify(value);
      if (finalConfig.compress && serialized.length > this.compressionThreshold) {
        processedValue = this.compress(value) as T;
        compressed = true;
      }

      const metadata: StorageMetadata = {
        version: APP_CONFIG.STORAGE_VERSION,
        createdAt: this.getExistingCreatedAt(key) || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: serialized.length,
        compressed,
        checksum: finalConfig.validate ? this.generateChecksum(serialized) : undefined
      };

      const storageItem = {
        data: processedValue,
        metadata
      };

      localStorage.setItem(key, JSON.stringify(storageItem));
      
      // Crear backup si está habilitado
      if (finalConfig.backup) {
        this.createBackup(key, storageItem);
      }

      return true;
    } catch (error) {
      console.error(`[StorageManager] Error writing key ${key}:`, error);
      
      // Intentar limpiar espacio y reintentar
      if (this.isQuotaExceeded(error)) {
        this.cleanupStorage();
        return this.retrySet(key, value, finalConfig);
      }
      
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      // Crear backup antes de eliminar
      const existing = localStorage.getItem(key);
      if (existing && this.config.backup) {
        this.createBackup(`deleted_${key}_${Date.now()}`, JSON.parse(existing));
      }

      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[StorageManager] Error removing key ${key}:`, error);
      return false;
    }
  }

  hasKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  clear(): boolean {
    try {
      if (this.config.backup) {
        this.createFullBackup();
      }
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing storage:', error);
      return false;
    }
  }

  // ==========================================
  // MÉTODOS DE LIMPIEZA ESPECÍFICA
  // ==========================================

  clearUserData(userId: string): boolean {
    try {
      const keysToCheck = Object.values(STORAGE_KEYS);
      let success = true;

      keysToCheck.forEach(key => {
        const data = this.get(key, []);
        if (Array.isArray(data)) {
          const filtered = data.filter((item: any) => item.userId !== userId);
          if (filtered.length !== data.length) {
            success = this.set(key, filtered) && success;
          }
        }
      });

      return success;
    } catch (error) {
      console.error(`[StorageManager] Error clearing user data for ${userId}:`, error);
      return false;
    }
  }

  clearCompanyData(companyId: string): boolean {
    try {
      const keysToCheck = Object.values(STORAGE_KEYS);
      let success = true;

      keysToCheck.forEach(key => {
        if (key === STORAGE_KEYS.SESSION) return; // Preserve session
        
        const data = this.get(key, []);
        if (Array.isArray(data)) {
          const filtered = data.filter((item: any) => item.companyId !== companyId);
          if (filtered.length !== data.length) {
            success = this.set(key, filtered) && success;
          }
        }
      });

      return success;
    } catch (error) {
      console.error(`[StorageManager] Error clearing company data for ${companyId}:`, error);
      return false;
    }
  }

  clearDemoData(): boolean {
    try {
      const keysToCheck = Object.values(STORAGE_KEYS);
      let success = true;

      keysToCheck.forEach(key => {
        const data = this.get(key, []);
        if (Array.isArray(data)) {
          const filtered = data.filter((item: any) => !item.isDemo);
          success = this.set(key, filtered) && success;
        }
      });

      return success;
    } catch (error) {
      console.error('[StorageManager] Error clearing demo data:', error);
      return false;
    }
  }

  // ==========================================
  // MÉTODOS DE UTILIDAD Y DIAGNÓSTICO
  // ==========================================

  getStorageInfo(): {
    totalSize: number;
    usedSize: number;
    freeSize: number;
    itemCount: number;
    items: Array<{ key: string; size: number; metadata?: StorageMetadata }>;
  } {
    const items: Array<{ key: string; size: number; metadata?: StorageMetadata }> = [];
    let totalUsed = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const size = value ? value.length : 0;
        totalUsed += size;

        try {
          const parsed = JSON.parse(value || '{}');
          items.push({
            key,
            size,
            metadata: this.hasMetadata(parsed) ? parsed.metadata : undefined
          });
        } catch {
          items.push({ key, size });
        }
      }
    }

    return {
      totalSize: APP_CONFIG.MAX_STORAGE_SIZE,
      usedSize: totalUsed,
      freeSize: APP_CONFIG.MAX_STORAGE_SIZE - totalUsed,
      itemCount: items.length,
      items: items.sort((a, b) => b.size - a.size)
    };
  }

  exportData(): string {
    const data: Record<string, any> = {};
    
    Object.values(STORAGE_KEYS).forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    });

    return JSON.stringify({
      version: APP_CONFIG.VERSION,
      exportedAt: new Date().toISOString(),
      data
    }, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);
      
      if (!imported.data || typeof imported.data !== 'object') {
        throw new Error('Invalid import format');
      }

      // Validar versión
      if (imported.version && imported.version !== APP_CONFIG.VERSION) {
        console.warn(`[StorageManager] Version mismatch: ${imported.version} vs ${APP_CONFIG.VERSION}`);
      }

      // Crear backup completo antes de importar
      this.createFullBackup();

      let success = true;
      Object.entries(imported.data).forEach(([key, value]) => {
        success = this.set(key, value) && success;
      });

      return success;
    } catch (error) {
      console.error('[StorageManager] Error importing data:', error);
      return false;
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private hasMetadata(obj: any): obj is { data: any; metadata: StorageMetadata } {
    return obj && typeof obj === 'object' && 'data' in obj && 'metadata' in obj;
  }

  private validateData(data: any, metadata: StorageMetadata): boolean {
    if (!metadata.checksum) return true;
    
    const currentChecksum = this.generateChecksum(JSON.stringify(data));
    return currentChecksum === metadata.checksum;
  }

  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private compress(data: any): string {
    // Implementación simple de compresión (en producción usar LZString o similar)
    const json = JSON.stringify(data);
    return btoa(json);
  }

  private decompress(compressedData: string): any {
    try {
      const json = atob(compressedData);
      return JSON.parse(json);
    } catch (error) {
      console.error('[StorageManager] Decompression failed:', error);
      return null;
    }
  }

  private getExistingCreatedAt(key: string): string | null {
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        return this.hasMetadata(parsed) ? parsed.metadata.createdAt : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private createBackup(key: string, data: any): void {
    try {
      const backupKey = `backup_${key}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(data));
      
      // Limpiar backups antiguos (mantener solo los últimos 5)
      this.cleanupBackups(key);
    } catch (error) {
      console.warn('[StorageManager] Backup creation failed:', error);
    }
  }

  private createFullBackup(): void {
    try {
      const backup: Record<string, any> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('backup_')) {
          backup[key] = localStorage.getItem(key);
        }
      }

      const backupKey = `full_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
    } catch (error) {
      console.warn('[StorageManager] Full backup creation failed:', error);
    }
  }

  private cleanupBackups(originalKey: string): void {
    const backupKeys = [];
    const prefix = `backup_${originalKey}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        backupKeys.push(key);
      }
    }

    // Mantener solo los 5 más recientes
    backupKeys.sort().slice(0, -5).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  private cleanupStorage(): void {
    // Eliminar backups antiguos primero
    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('backup_') || key.startsWith('full_backup_'))) {
        backupKeys.push(key);
      }
    }

    backupKeys.forEach(key => localStorage.removeItem(key));

    // Comprimir datos grandes si no están comprimidos
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item && item.length > this.compressionThreshold) {
        const data = this.get(key);
        if (data) {
          this.set(key, data, { compress: true });
        }
      }
    });
  }

  private isQuotaExceeded(error: any): boolean {
    return error instanceof DOMException && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  private retrySet<T>(key: string, value: T, config: StorageConfig, attempt = 1): boolean {
    if (attempt > this.maxRetries) {
      console.error(`[StorageManager] Max retries exceeded for key: ${key}`);
      return false;
    }

    try {
      const storageItem = {
        data: value,
        metadata: {
          version: APP_CONFIG.STORAGE_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          size: JSON.stringify(value).length,
          compressed: false
        }
      };

      localStorage.setItem(key, JSON.stringify(storageItem));
      return true;
    } catch (error) {
      console.warn(`[StorageManager] Retry ${attempt} failed for key ${key}:`, error);
      return this.retrySet(key, value, config, attempt + 1);
    }
  }
}

// Singleton instance
export const storageManager = new StorageManager();