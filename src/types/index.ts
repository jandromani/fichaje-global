// ==========================================
// MODELOS DE DATOS PRINCIPALES
// ==========================================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus: 'pending' | 'synced' | 'error';
  isDemo?: boolean;
  companyId: string;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee';
  stationIds: string[];
  isActive: boolean;
  avatar?: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  startDate: string;
  salary?: number;
  currency?: string;
  timezone: string;
  locale: string;
  lastLoginAt?: string;
  passwordHash: string;
  permissions: Permission[];
}

export interface Company extends BaseEntity {
  name: string;
  logo?: string;
  address: string;
  timezone: string;
  locale: string;
  currency: string;
  workingHours: {
    start: string; // HH:mm format
    end: string;
    days: number[]; // 0-6, Sunday-Saturday
  };
  settings: {
    allowMobileClockIn: boolean;
    requireQR: boolean;
    maxClockInDistance: number; // meters
    overtimeThreshold: number; // minutes
    autoBreakDeduction: number; // minutes
    roundingRules: 'none' | '15min' | '30min';
  };
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    maxUsers: number;
    expiresAt?: string;
  };
}

export interface Station extends BaseEntity {
  name: string;
  location: {
    lat?: number;
    lng?: number;
    address: string;
  };
  qrCode: string;
  qrMetadata: QRMetadata;
  isActive: boolean;
  allowedUserIds: string[];
  description?: string;
  stationType: 'entrance' | 'office' | 'warehouse' | 'mobile' | 'kiosk';
  restrictions: {
    timeWindows?: { start: string; end: string; days: number[] }[];
    ipWhitelist?: string[];
    deviceFingerprint?: string;
  };
}

export interface QRTemplate extends BaseEntity {
  name: string;
  stationId: string;
  companyId: string;
  colors: {
    foreground: string;
    background: string;
  };
  logo?: string;
  header: string;
  footer: string;
  instructions: Record<string, string>; // locale -> text
  isDefault: boolean;
}

export interface ClockIn extends BaseEntity {
  userId: string;
  stationId: string;
  type: 'in' | 'out' | 'break_start' | 'break_end';
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  method: 'qr' | 'manual' | 'nfc' | 'biometric';
  deviceInfo: {
    userAgent: string;
    ip?: string;
    fingerprint?: string;
  };
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  isManualEntry: boolean;
  photoEvidence?: string;
  duration?: number; // calculated field for paired clock-ins
}

export interface LeaveRequest extends BaseEntity {
  userId: string;
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'bereavement' | 'unpaid';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachments?: string[];
  isHalfDay: boolean;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'clockin' | 'leave' | 'system';
  isRead: boolean;
  actionRequired: boolean;
  relatedEntityType?: 'clockin' | 'leave' | 'user' | 'station' | 'company';
  relatedEntityId?: string;
  expiresAt?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ==========================================
// TIPOS AUXILIARES Y CONFIGURACIÓN
// ==========================================

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'approve')[];
}

export interface QRMetadata {
  stationId: string;
  companyId: string;
  timestamp: string;
  version: string;
  signature?: string;
  expiresAt?: string;
  isTemporary: boolean;
  templateId?: string;
}

export interface UserSession {
  user: User;
  company: Company;
  loginAt: string;
  expiresAt: string;
  permissions: Permission[];
  activeStationId?: string;
  lastActivity: string;
  deviceFingerprint: string;
}

export interface LocalClockIn extends ClockIn {
  localId: string;
  needsSync: boolean;
  syncAttempts: number;
  lastSyncAttempt?: string;
  syncError?: string;
}

export interface AppMode {
  mode: 'demo' | 'production' | 'debug';
  features: {
    enableSync: boolean;
    enableNotifications: boolean;
    enableGeolocation: boolean;
    enableDebugPanel: boolean;
    mockData: boolean;
  };
  ui: {
    showModeBanner: boolean;
    allowDataExport: boolean;
    allowDataImport: boolean;
    enableDevTools: boolean;
  };
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync?: string;
  pendingCount: number;
  errorCount: number;
  isProcessing: boolean;
  queue: SyncQueueItem[];
}

export interface SyncQueueItem {
  id: string;
  type: 'clockin' | 'leave' | 'user' | 'notification';
  action: 'create' | 'update' | 'delete';
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextRetry?: string;
  error?: string;
}

// ==========================================
// TIPOS DE ESTADO Y UI
// ==========================================

export interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FilterState {
  search: string;
  dateRange: {
    start?: string;
    end?: string;
  };
  status?: string[];
  type?: string[];
  userId?: string;
  stationId?: string;
}

export interface ReportConfig {
  type: 'attendance' | 'overtime' | 'leaves' | 'productivity' | 'custom';
  period: {
    start: string;
    end: string;
  };
  groupBy: 'user' | 'department' | 'station' | 'day' | 'week' | 'month';
  filters: FilterState;
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
}

// ==========================================
// CONFIGURACIÓN Y CONSTANTES
// ==========================================

export const APP_CONFIG = {
  VERSION: '1.0.0',
  STORAGE_VERSION: '1.0',
  MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB
  SYNC_INTERVAL: 30000, // 30 seconds
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  QR_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  MAX_SYNC_RETRIES: 3,
  COMPRESSION_THRESHOLD: 1000, // records
} as const;

export const STORAGE_KEYS = {
  USERS: 'wmapp_users',
  COMPANIES: 'wmapp_companies',
  STATIONS: 'wmapp_stations',
  CLOCKINS: 'wmapp_clockins',
  LEAVE_REQUESTS: 'wmapp_leave_requests',
  NOTIFICATIONS: 'wmapp_notifications',
  SESSION: 'wmapp_session',
  APP_MODE: 'wmapp_mode',
  SYNC_QUEUE: 'wmapp_sync_queue',
  SETTINGS: 'wmapp_settings',
  QR_TEMPLATES: 'wmapp_qr_templates',
} as const;

export const DEFAULT_PERMISSIONS: Record<User['role'], Permission[]> = {
  admin: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'approve'] }
  ],
  manager: [
    { resource: 'users', actions: ['read', 'update'] },
    { resource: 'clockins', actions: ['read', 'update', 'approve'] },
    { resource: 'leaves', actions: ['read', 'approve'] },
    { resource: 'stations', actions: ['read'] },
    { resource: 'reports', actions: ['read'] }
  ],
  employee: [
    { resource: 'clockins', actions: ['create', 'read'] },
    { resource: 'leaves', actions: ['create', 'read', 'update'] },
    { resource: 'profile', actions: ['read', 'update'] }
  ]
};
// ==========================================
// LEGAL TYPES
// ==========================================

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
