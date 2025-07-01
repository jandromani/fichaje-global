export interface LegalConsent {
  workerId: string;
  acceptedAt: string; // ISO 8601
  language: string;
  consentText: string;
}

export interface LegalReportEntry {
  date: string;
  type: string;
  stationId: string;
  stationLocation?: string;
}

export interface LegalReport {
  employeeName: string;
  entries: LegalReportEntry[];
  qrStationIds: string[];
  signature?: string;
  deviceHash: string;
  appVersion: string;
}

import { storageManager } from './storageManager';
import { jsPDF } from 'jspdf';
import { APP_CONFIG } from '../types';

const CONSENT_KEY = 'wmapp_legal_consents';

export const legalTexts: Record<string, { consent: string; privacy: string[]; disclaimer: string; aid: string }> = {
  es: {
    consent:
      'La empresa garantizar\u00E1 el registro diario de jornada, incluyendo el horario concreto de inicio y finalizaci\u00F3n de la jornada de trabajo de cada persona trabajadora. — Art\u00EDculo 34.9, Estatuto de los Trabajadores (Espa\u00F1a)',
    privacy: [
      'No se recogen datos biom\u00E9tricos.',
      'No se env\u00EDan datos a servidores externos.',
      'Los datos se guardan exclusivamente en el dispositivo del usuario.',
      'La aplicaci\u00F3n es responsable de la herramienta, no del uso administrativo o legal final.'
    ],
    disclaimer: 'Esta herramienta no sustituye la asesor\u00EDa legal. Su uso debe revisarse conforme a la legislaci\u00F3n de tu pa\u00EDs.',
    aid: 'Comparativa entre legislaci\u00F3n espa\u00F1ola y la local (si existe).' 
  },
  en: {
    consent:
      'The company will guarantee the daily record of working hours, including the specific start and end times of each worker\'s day. — Article 34.9, Workers\' Statute (Spain)',
    privacy: [
      'No biometric data is collected.',
      'No data is sent to external servers.',
      'Data is stored exclusively on the user\'s device.',
      'The application is responsible for the tool, not for final administrative or legal use.'
    ],
    disclaimer: 'This tool does not replace legal advice. Its use must be reviewed according to your country\'s legislation.',
    aid: 'Comparison between Spanish legislation and local law (if available).' 
  },
  bn: {
    consent:
      '\u0985\u09B0\u09CD\u09A5\u09C7 \u0995\u09CD\u09B0\u09AE\u09BF \u09AA\u09CD\u09B0\u09A4\u09BF\u09A6\u09BF\u09A8 \u09B0\u09CB\u099C\u09BE\u09B0 \u09A8\u09BF\u09A6\u09B0\u09CD\u09B6 \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u0989\u09A6\u09CD\u09AF\u09CB\u0997 \u0995\u09B0\u09AC\u09C7, \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u0995\u09CD\u09B7 \u0986\u09B0\u09AE\u09CD\u09AD \u0986\u09B0\u09AE\u09CD\u09AD \u09B8\u09AE\u09DF \u0986\u09B0\u09AE\u09CD\u09AD \u09B8\u09B9\u0995\u09BE\u09B2\u09C7 \u09B6\u09C1\u09B0\u09C1 \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09A4\u09C7 \u09AB\u09B0\u09AE\u09BE\u09A8 \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u0995\u09B0\u09BE \u09B9\u09AC\u09C7। — \u09A8\u09BF\u09AF\u09BC\u09AE 34.9, \u09B8\u09CD\u0995\u09B0\u09CD\u09AE\u09B8\u09A8\u09CD\u09A4 \u0985\u09AB \u09A6\u09BE \u09A4\u09CD\u09B0\u09BE\u09AC\u09BE\u09A6\u09C7\u09B0\u09B8 (\u09B8\u09CD\u09AA\u09C7\u0987\u09A8)',
    privacy: [
      '\u0995\u09CB\u09A8 \u09AC\u09BE\u09AF\u09CB\u09AE\u09C7\u099F\u09CD\u09B0\u09BF\u0995 \u09A1\u09C7\u099F\u09BE \u09B8\u0999\u09CD\u0995\u09B2\u09A8\u09BE \u09B9\u09DF\u09A8।',
      '\u0995\u09CB\u09A8 \u09A1\u09C7\u099F\u09BE \u09AC\u09BE\u09B9\u09BF\u09B0 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09A8।',
      '\u09A1\u09C7\u099F\u09BE \u0985\u09AA\u09A8\u09BE\u09B0 \u09AA\u09CD\u09B0\u09A4\u09BF\u09B7\u09CD\u09A0\u09BE\u09A8 \u09AA\u09C7 \u09B0\u09BE\u0996\u09BE \u09B9\u09DF\u09A8।',
      '\u098F\u09AA\u09CD\u09B2\u09BF\u0995\u09C7\u09B6\u09A8 \u09B8\u09B0\u09A8\u09BE\u09AE \u09AE\u09C1\u0995\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09BF\u09B7\u09CD\u09A0\u09BE \u09AF\u09A8\u09BE \u0995\u09B0\u09C7, \u09B6\u09C7\u09B7 \u09AA\u09CD\u09B0\u09B6\u09BE\u09B8\u09A8\u09C7 \u09A8\u09C7।'
    ],
    disclaimer: 'এই টুল কোনও আইনি পরামর্শের বিকল্প নয়। আপনার দেশের আইন অনুসারে এর ব্যবহার পর্যালোচনা করা উচিত।',
    aid: 'স্পেনের আইন ও স্থানীয় আইনের তুলনা (যদি থাকে)।'
  },
  'zh-TW': {
    consent:
      '\u516C\u53F8\u5C07\u4FDD\u8B49\u65E5\u5E38\u8A18\u9304\u5DE5\u4F5C\u6642\u6578\uFF0C\u5305\u62EC\u6BCF\u500B\u52DE\u5DE5\u5DE5\u4F5C\u65E5\u7684\u958B\u59CB\u548C\u7D42\u6B62\u6642\u9593\u3002\u2014\u897F\u73ED\u7259\u52DE\u5DE5\u6CD5\u7AE0 34.9',
    privacy: [
      '\u4E0D\u6536\u96C6\u751F\u7269\u8CC7\u6599\u3002',
      '\u4E0D\u5C07\u8CC7\u6599\u50B3\u9001\u5230\u5916\u90E8\u4F3A\u670D\u5668\u3002',
      '\u8CC7\u6599\u50C5\u4FDD\u5B58\u5728\u7528\u6236\u8A2D\u5099\u4E2D\u3002',
      '\u61C9\u7528\u7A0B\u5F0F\u53EA\u5C0D\u5DE5\u5177\u672C\u8EAB\u8CA0\u8CAC\uFF0C\u4E0D\u5C0D\u884C\u653F\u6216\u6CD5\u5F8B\u4F7F\u7528\u627F\u64D4\u8CAC\u4EFB\u3002'
    ],
    disclaimer: '\u9019\u500B\u5DE5\u5177\u4E0D\u53EF\u53D6\u4EE3\u6CD5\u5F8B\u5C0E\u5E2B\u3002\u4F7F\u7528\u524D\u61C9\u6AA2\u8996\u5404\u56FD\u6CD5\u5F8B\u3002',
    aid: '\u897F\u73ED\u7259\u6CD5\u4F8B\u8207\u7576\u5730\u6CD5\u898F\u6BD4\u8F03\uFF08\u5982\u6709\uFF09\u3002'
  },
  ar: {
    consent:
      '\u062A\u0644\u062A\u0632\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u062A\u0633\u062C\u064A\u0644 \u064A\u0648\u0645\u064A \u0644\u0644\u0633\u0627\u0639\u0627\u062A \u0645\u062A\u0636\u0645\u0646\u0627 \u0648\u0642\u062A \u0628\u062F\u0621 \u0648\u0627\u0646\u062A\u0647\u0627\u0621 \u0643\u0644 \u0639\u0627\u0645\u0644. — \u0627\u0644\u0645\u0627\u062F\u0629 34.9 \u0645\u0646 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0625\u0633\u0628\u0627\u0646\u064A',
    privacy: [
      '\u0644\u0627 \u062A\u064F\u062C\u0645\u064E\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u062D\u064A\u0648\u064A\u0629.',
      '\u0644\u0627 \u064A\u064F\u0631\u0633\u064E\u0644 \u0623\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0625\u0644\u0649 \u062E\u0648\u0627\u062F\u0645 \u062E\u0627\u0631\u062C\u064A\u0629.',
      '\u062A\u064F\u062D\u0641\u064E\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0635\u0631\u0627\u064B \u0641\u064A \u062C\u0647\u0627\u0632 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.',
      '\u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u0623\u062F\u0627\u0629 \u0641\u0642\u0637 \u0648\u0644\u064A\u0633 \u0639\u0646 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u064A \u0623\u0648 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A \u0627\u0644\u0646\u0647\u0627\u0626\u064A.'
    ],
    disclaimer: '\u0647\u0630\u0647 \u0627\u0644\u0623\u062F\u0627\u0629 \u0644\u0627 \u062A\u063A\u0646\u064A \u0639\u0646 \u0627\u0644\u0645\u0634\u0648\u0631\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629. \u064A\u062C\u0628 \u0641\u062D\u0635 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627 \u062D\u0633\u0628 \u0642\u0648\u0627\u0646\u064A\u0646 \u0628\u0644\u062F\u0643.',
    aid: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u064A\u0646 \u0627\u0644\u062A\u0634\u0631\u064A\u0639 \u0627\u0644\u0625\u0633\u0628\u0627\u0646\u064A \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0645\u062D\u0644\u064A (\u0625\u0630\u0627 \u0648\u062C\u062F).'
  },
  fr: {
    consent:
      "L'entreprise garantira l'enregistrement quotidien de la journ\u00E9e de travail, y compris l'heure de d\u00E9but et de fin de chaque journ\u00E9e de travail. — Article 34.9, Statut des Travailleurs (Espagne)",
    privacy: [
      "Aucune donn\u00E9e biom\u00E9trique n'est collect\u00E9e.",
      "Aucune donn\u00E9e n'est envoy\u00E9e \u00E0 des serveurs externes.",
      "Les donn\u00E9es sont stock\u00E9es exclusivement sur l'appareil de l'utilisateur.",
      "L'application est responsable de l'outil et non de l'utilisation administrative ou l\u00E9gale finale."
    ],
    disclaimer: "Cet outil ne remplace pas les conseils juridiques. Son utilisation doit \u00EAtre revue conform\u00E9ment \u00E0 la l\u00E9gislation de votre pays.",
    aid: "Comparaison entre la l\u00E9gislation espagnole et la l\u00E9gislation locale (si disponible)."
  }
};

export function getPreferredLanguage(): string {
  const lang = navigator.language.split('-')[0];
  if (legalTexts[lang]) return lang;
  return 'es';
}

export function saveConsent(consent: LegalConsent): void {
  const consents = storageManager.get<LegalConsent[]>(CONSENT_KEY, []);
  const filtered = consents.filter(c => c.workerId !== consent.workerId);
  storageManager.set(CONSENT_KEY, [...filtered, consent]);
}

export function getConsent(workerId: string): LegalConsent | undefined {
  const consents = storageManager.get<LegalConsent[]>(CONSENT_KEY, []);
  return consents.find(c => c.workerId === workerId);
}

export function isConsentExpired(consent: LegalConsent): boolean {
  const accepted = new Date(consent.acceptedAt).getTime();
  const now = Date.now();
  return now - accepted > 365 * 24 * 60 * 60 * 1000; // 12 months
}

export async function generateLegalReport(report: LegalReport): Promise<{ pdf: Blob; json: Blob }> {
  const doc = new jsPDF();
  doc.text('Informe de Registro de Jornada', 10, 10);
  doc.text('Empleado: ' + report.employeeName, 10, 20);
  doc.text('Dispositivo: ' + report.deviceHash, 10, 30);
  doc.text('Versi\u00F3n: ' + report.appVersion, 10, 40);
  doc.text('---', 10, 50);
  let y = 60;
  report.entries.forEach(e => {
    doc.text(`${e.date} - ${e.type} - ${e.stationId}`, 10, y);
    y += 10;
  });
  doc.text('Este informe es compatible con el modelo exigido por el Ministerio de Trabajo seg\u00FAn el art\u00EDculo 34.9 del Estatuto de los Trabajadores (Espa\u00F1a).', 10, y + 10);

  const pdfBlob = doc.output('blob');
  const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  return { pdf: pdfBlob, json: jsonBlob };
}

export function startLegalPurge() {
  setInterval(() => {
    purgeConsents();
    purgeClockIns();
  }, 24 * 60 * 60 * 1000);
}

function purgeConsents() {
  const consents = storageManager.get<LegalConsent[]>(CONSENT_KEY, []);
  const valid = consents.filter(c => !isConsentExpired(c));
  storageManager.set(CONSENT_KEY, valid);
}

function purgeClockIns() {
  const clockins = storageManager.get<any[]>('wmapp_clockins', []);
  const threshold = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const filtered = clockins.filter(c => new Date(c.timestamp).getTime() > threshold || c.exported);
  storageManager.set('wmapp_clockins', filtered);
}
