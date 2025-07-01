import { storageManager } from './storageManager';
import { STORAGE_KEYS, ConsentRecord, LegalReport, User, Company, ClockIn } from '../types';

class LegalFramework {
  recordConsent(userId: string): void {
    const records = storageManager.get<ConsentRecord[]>(STORAGE_KEYS.CONSENTS, []);
    const existing = records.find(r => r.userId === userId);
    if (!existing) {
      const now = new Date().toISOString();
      records.push({
        id: `${userId}_${now}`,
        userId,
        consentGivenAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'synced',
        companyId: ''
      });
      storageManager.set(STORAGE_KEYS.CONSENTS, records);
    }
  }

  generateLegalReport(companyId: string, weekStart: string): LegalReport | null {
    try {
      const companies = storageManager.get<Company[]>(STORAGE_KEYS.COMPANIES, []);
      const company = companies.find(c => c.id === companyId);
      if (!company) return null;

      const users = storageManager.get<User[]>(STORAGE_KEYS.USERS, []).filter(u => u.companyId === companyId);
      const clockIns = storageManager.get<ClockIn[]>(STORAGE_KEYS.CLOCKINS, []).filter(c => c.companyId === companyId);

      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startISO = start.toISOString().split('T')[0];
      const endISO = end.toISOString().split('T')[0];

      const weeklyClockIns = clockIns.filter(c => c.timestamp >= `${startISO}T00:00:00` && c.timestamp <= `${endISO}T23:59:59`);

      const entries = users.map(u => {
        const records = weeklyClockIns.filter(c => c.userId === u.id).map(c => ({ type: c.type, timestamp: c.timestamp }));
        return {
          userId: u.id,
          userName: `${u.firstName} ${u.lastName}`,
          nationalId: u.nationalId,
          records
        };
      });

      const now = new Date().toISOString();
      const report: LegalReport = {
        id: `report_${now}`,
        companyId,
        weekStart: startISO,
        weekEnd: endISO,
        companyName: company.name,
        companyTaxId: company.taxId,
        entries,
        generatedAt: now,
        digitalSignature: btoa(now),
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'synced'
      };

      const stored = storageManager.get<LegalReport[]>(STORAGE_KEYS.LEGAL_REPORTS, []);
      stored.push(report);
      storageManager.set(STORAGE_KEYS.LEGAL_REPORTS, stored);
      return report;
    } catch {
      return null;
    }
  }

  getReports(companyId: string): LegalReport[] {
    const all = storageManager.get<LegalReport[]>(STORAGE_KEYS.LEGAL_REPORTS, []);
    return all.filter(r => r.companyId === companyId);
  }
}

export const legalFramework = new LegalFramework();
