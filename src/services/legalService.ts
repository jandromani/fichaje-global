import { storageManager } from './storageManager';
import { STORAGE_KEYS, APP_CONFIG, User } from '../types';

export interface ConsentRecord {
  userId: string;
  acceptedAt: string;
  version: string;
  lang: string;
}

export const legalService = {
  getConsent(userId: string): ConsentRecord | null {
    return storageManager.get<ConsentRecord>(`wmapp_consent_${userId}`);
  },

  saveConsent(userId: string, lang: string) {
    const record: ConsentRecord = {
      userId,
      acceptedAt: new Date().toISOString(),
      version: APP_CONFIG.VERSION,
      lang,
    };
    storageManager.set(`wmapp_consent_${userId}`, record);
  },

  downloadUserData(userId: string): string {
    const result: Record<string, any> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      const value = storageManager.get<any>(key);
      if (!value) return;
      if (Array.isArray(value)) {
        const filtered = value.filter((v: any) => v.userId === userId || v.id === userId || v.user?.id === userId);
        if (filtered.length) result[key] = filtered;
      } else if (value.userId === userId || value.user?.id === userId) {
        result[key] = value;
      }
    });
    return JSON.stringify({
      version: APP_CONFIG.VERSION,
      exportedAt: new Date().toISOString(),
      userId,
      data: result,
    }, null, 2);
  },

  deleteAccount(userId: string): void {
    const users = storageManager.get<User[]>(STORAGE_KEYS.USERS, []);
    storageManager.set(STORAGE_KEYS.USERS, users.filter(u => u.id !== userId));
    storageManager.clearUserData(userId);
    storageManager.remove(STORAGE_KEYS.SESSION);
    storageManager.remove(`wmapp_consent_${userId}`);
  }
};
