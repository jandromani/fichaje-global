import { storageManager } from './storageManager';
import { qrEngine } from './qrEngine';
import bcrypt from 'bcryptjs';
import type { User, Company, Station, ClockIn, LeaveRequest, Notification, AppMode } from '../types';

// ==========================================
// INICIALIZACIÓN DE ENTORNO DEMO
// ==========================================

interface InitializationResult {
  success: boolean;
  mode: AppMode['mode'];
  company: Company;
  users: User[];
  message: string;
}

class EnvironmentInitializer {
  private readonly demoCompanyId = 'demo_company_001';
  private readonly adminUserId = 'demo_admin_001';

  // ==========================================
  // MÉTODO PRINCIPAL DE INICIALIZACIÓN
  // ==========================================

  async initializeEnvironment(): Promise<InitializationResult> {
    try {
      console.log('[EnvironmentInitializer] Starting initialization...');

      // Verificar si ya está inicializado
      if (this.isAlreadyInitialized()) {
        console.log('[EnvironmentInitializer] Already initialized, loading existing data...');
        const existingCompany = storageManager.get<Company[]>('wmapp_companies', [])[0];
        const existingUsers = storageManager.get<User[]>('wmapp_users', []);
        
        return {
          success: true,
          mode: 'demo',
          company: existingCompany,
          users: existingUsers,
          message: 'Environment already initialized'
        };
      }

      console.log('[EnvironmentInitializer] Creating demo data...');

      // Crear datos demo
      const company = await this.createDemoCompany();
      const users = await this.createDemoUsers(company.id);
      const stations = await this.createDemoStations(company.id);
      const clockIns = await this.createDemoClockIns(users, stations);
      const leaveRequests = await this.createDemoLeaveRequests(users);
      const notifications = await this.createDemoNotifications(users);

      // Configurar modo demo
      const appMode = this.createDemoAppMode();

      console.log('[EnvironmentInitializer] Saving data to storage...');

      // Guardar todo en localStorage
      storageManager.set('wmapp_companies', [company]);
      storageManager.set('wmapp_users', users);
      storageManager.set('wmapp_stations', stations);
      storageManager.set('wmapp_clockins', clockIns);
      storageManager.set('wmapp_leave_requests', leaveRequests);
      storageManager.set('wmapp_notifications', notifications);
      storageManager.set('wmapp_mode', appMode);
      storageManager.set('wmapp_initialized', true);

      console.log('[EnvironmentInitializer] Demo environment created successfully');

      return {
        success: true,
        mode: 'demo',
        company,
        users,
        message: 'Demo environment initialized successfully'
      };

    } catch (error) {
      console.error('[EnvironmentInitializer] Initialization failed:', error);
      return {
        success: false,
        mode: 'demo',
        company: {} as Company,
        users: [],
        message: 'Initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  // ==========================================
  // CREACIÓN DE DATOS DEMO
  // ==========================================

  private async createDemoCompany(): Promise<Company> {
    const now = new Date().toISOString();

    const company: Company = {
      id: this.demoCompanyId,
      name: 'Empresa Demo S.L.',
      logo: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200',
      address: 'Calle Principal 123, Madrid, España',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      currency: 'EUR',
      workingHours: {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5] // Lunes a Viernes
      },
      settings: {
        allowMobileClockIn: true,
        requireQR: true,
        maxClockInDistance: 100,
        overtimeThreshold: 480,
        autoBreakDeduction: 30,
        roundingRules: '15min'
      },
      subscription: {
        plan: 'premium',
        maxUsers: 50,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'synced',
      isDemo: true,
      companyId: this.demoCompanyId
    };

    return company;
  }

  private async createDemoUsers(companyId: string): Promise<User[]> {
    const now = new Date().toISOString();
    const baseUser = {
      companyId,
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'synced' as const,
      isDemo: true,
      isActive: true,
      currency: 'EUR',
      startDate: '2024-01-01'
    };

    const users: User[] = [
      {
        ...baseUser,
        id: this.adminUserId,
        email: 'admin@demo.com',
        firstName: 'Ana',
        lastName: 'García',
        role: 'admin',
        stationIds: ['demo_station_001', 'demo_station_002'],
        avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',
        phoneNumber: '+34 600 123 456',
        department: 'Administración',
        position: 'Directora General',
        salary: 45000,
        passwordHash: bcrypt.hashSync('hello', 10), // Hash fijo para 'hello'
        permissions: [
          { resource: '*', actions: ['create', 'read', 'update', 'delete', 'approve'] }
        ]
      },
      {
        ...baseUser,
        id: 'demo_manager_001',
        email: 'manager@demo.com',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        role: 'manager',
        stationIds: ['demo_station_001'],
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
        phoneNumber: '+34 600 234 567',
        department: 'Operaciones',
        position: 'Jefe de Operaciones',
        salary: 35000,
        passwordHash: bcrypt.hashSync('hello', 10),
        permissions: [
          { resource: 'users', actions: ['read', 'update'] },
          { resource: 'clockins', actions: ['read', 'update', 'approve'] },
          { resource: 'leaves', actions: ['read', 'approve'] },
          { resource: 'stations', actions: ['read'] },
          { resource: 'reports', actions: ['read'] }
        ]
      },
      {
        ...baseUser,
        id: 'demo_employee_001',
        email: 'empleado1@demo.com',
        firstName: 'María',
        lastName: 'López',
        role: 'employee',
        stationIds: ['demo_station_001'],
        avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
        phoneNumber: '+34 600 345 678',
        department: 'Ventas',
        position: 'Comercial',
        salary: 28000,
        passwordHash: bcrypt.hashSync('hello', 10),
        permissions: [
          { resource: 'clockins', actions: ['create', 'read'] },
          { resource: 'leaves', actions: ['create', 'read', 'update'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ]
      },
      {
        ...baseUser,
        id: 'demo_employee_002',
        email: 'empleado2@demo.com',
        firstName: 'David',
        lastName: 'Martín',
        role: 'employee',
        stationIds: ['demo_station_002'],
        avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200',
        phoneNumber: '+34 600 456 789',
        department: 'Almacén',
        position: 'Operario',
        salary: 24000,
        passwordHash: bcrypt.hashSync('hello', 10),
        permissions: [
          { resource: 'clockins', actions: ['create', 'read'] },
          { resource: 'leaves', actions: ['create', 'read', 'update'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ]
      }
    ];

    return users;
  }

  private async createDemoStations(companyId: string): Promise<Station[]> {
    const now = new Date().toISOString();

    const stations: Station[] = [
      {
        id: 'demo_station_001',
        name: 'Entrada Principal',
        location: {
          lat: 40.4168,
          lng: -3.7038,
          address: 'Calle Principal 123, Madrid'
        },
        qrCode: await qrEngine.generateStationQR('demo_station_001', companyId, { language: 'es-ES', mode: 'demo' }),
        qrMetadata: {
          stationId: 'demo_station_001',
          companyId,
          timestamp: now,
          version: '1.0',
          language: 'es-ES',
          mode: 'demo',
          isTemporary: false
        },
        isActive: true,
        allowedUserIds: ['demo_admin_001', 'demo_manager_001', 'demo_employee_001'],
        description: 'Punto de fichaje principal del edificio',
        stationType: 'entrance',
        restrictions: {
          timeWindows: [
            { start: '07:00', end: '20:00', days: [1, 2, 3, 4, 5] }
          ]
        },
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'synced',
        isDemo: true,
        companyId
      },
      {
        id: 'demo_station_002',
        name: 'Almacén',
        location: {
          lat: 40.4170,
          lng: -3.7040,
          address: 'Almacén - Planta Baja'
        },
        qrCode: await qrEngine.generateStationQR('demo_station_002', companyId, { language: 'es-ES', mode: 'demo' }),
        qrMetadata: {
          stationId: 'demo_station_002',
          companyId,
          timestamp: now,
          version: '1.0',
          language: 'es-ES',
          mode: 'demo',
          isTemporary: false
        },
        isActive: true,
        allowedUserIds: ['demo_admin_001', 'demo_employee_002'],
        description: 'Punto de fichaje del almacén',
        stationType: 'warehouse',
        restrictions: {
          timeWindows: [
            { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] }
          ]
        },
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'synced',
        isDemo: true,
        companyId
      }
    ];

    return stations;
  }

  private async createDemoClockIns(users: User[], stations: Station[]): Promise<ClockIn[]> {
    const clockIns: ClockIn[] = [];
    const now = new Date();

    // Generar fichajes para los últimos 7 días
    for (let day = 6; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      
      // Solo días laborables
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      users.filter(u => u.role !== 'admin').forEach(user => {
        const userStation = stations.find(s => s.allowedUserIds.includes(user.id));
        if (!userStation) return;

        const baseClockIn = {
          userId: user.id,
          stationId: userStation.id,
          location: userStation.location.lat ? {
            lat: userStation.location.lat + (Math.random() - 0.5) * 0.001,
            lng: userStation.location.lng! + (Math.random() - 0.5) * 0.001,
            accuracy: 10
          } : undefined,
          method: 'qr' as const,
          deviceInfo: {
            userAgent: navigator.userAgent,
            ip: '192.168.1.100',
            fingerprint: 'demo_device_' + user.id
          },
          isManualEntry: false,
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
          version: 1,
          syncStatus: 'synced' as const,
          isDemo: true,
          companyId: user.companyId
        };

        // Entrada (9:00 ± 30 min)
        const entryTime = new Date(date);
        entryTime.setHours(9, Math.random() * 60 - 30, 0, 0);
        
        clockIns.push({
          ...baseClockIn,
          id: `demo_clockin_${user.id}_${day}_in`,
          type: 'in',
          timestamp: entryTime.toISOString(),
          notes: day === 0 ? 'Fichaje de hoy' : undefined
        });

        // Salida (18:00 ± 30 min) - solo si no es hoy
        if (day > 0) {
          const exitTime = new Date(date);
          exitTime.setHours(18, Math.random() * 60 - 30, 0, 0);
          
          clockIns.push({
            ...baseClockIn,
            id: `demo_clockin_${user.id}_${day}_out`,
            type: 'out',
            timestamp: exitTime.toISOString(),
            duration: exitTime.getTime() - entryTime.getTime()
          });
        }
      });
    }

    return clockIns;
  }

  private async createDemoLeaveRequests(users: User[]): Promise<LeaveRequest[]> {
    const now = new Date().toISOString();
    const requests: LeaveRequest[] = [];

    // Solicitud aprobada
    requests.push({
      id: 'demo_leave_001',
      userId: 'demo_employee_001',
      type: 'vacation',
      startDate: '2024-12-23',
      endDate: '2024-12-27',
      totalDays: 5,
      reason: 'Vacaciones de Navidad',
      status: 'approved',
      approvedBy: 'demo_admin_001',
      approvedAt: now,
      isHalfDay: false,
      urgency: 'low',
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'synced',
      isDemo: true,
      companyId: users[0].companyId
    });

    // Solicitud pendiente
    requests.push({
      id: 'demo_leave_002',
      userId: 'demo_employee_002',
      type: 'sick',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalDays: 2,
      reason: 'Cita médica',
      status: 'pending',
      isHalfDay: false,
      urgency: 'medium',
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'synced',
      isDemo: true,
      companyId: users[0].companyId
    });

    return requests;
  }

  private async createDemoNotifications(users: User[]): Promise<Notification[]> {
    const now = new Date().toISOString();
    const notifications: Notification[] = [];

    users.forEach(user => {
      notifications.push({
        id: `demo_notification_${user.id}_welcome`,
        userId: user.id,
        title: '¡Bienvenido al sistema!',
        message: 'Tu cuenta ha sido configurada correctamente. Puedes empezar a usar el sistema de fichajes.',
        type: 'success',
        isRead: user.role === 'admin',
        actionRequired: false,
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'synced',
        isDemo: true,
        companyId: user.companyId
      });
    });

    // Notificación de solicitud pendiente para admin
    notifications.push({
      id: 'demo_notification_leave_pending',
      userId: 'demo_admin_001',
      title: 'Solicitud de ausencia pendiente',
      message: 'David Martín ha solicitado 2 días de baja médica. Requiere aprobación.',
      type: 'warning',
      isRead: false,
      actionRequired: true,
      relatedEntityType: 'leave',
      relatedEntityId: 'demo_leave_002',
      priority: 'high',
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'synced',
      isDemo: true,
      companyId: users[0].companyId
    });

    return notifications;
  }

  private createDemoAppMode(): AppMode {
    return {
      mode: 'demo',
      features: {
        enableSync: true,
        enableNotifications: true,
        enableGeolocation: true,
        enableDebugPanel: false,
        mockData: true
      },
      ui: {
        showModeBanner: true,
        allowDataExport: true,
        allowDataImport: true,
        enableDevTools: false
      }
    };
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  private isAlreadyInitialized(): boolean {
    const initialized = storageManager.get('wmapp_initialized', false);
    const users = storageManager.get('wmapp_users', []);
    const companies = storageManager.get('wmapp_companies', []);
    
    return initialized && users.length > 0 && companies.length > 0;
  }

  resetEnvironment(): void {
    const keysToRemove = [
      'wmapp_companies',
      'wmapp_users', 
      'wmapp_stations',
      'wmapp_clockins',
      'wmapp_leave_requests',
      'wmapp_notifications',
      'wmapp_session',
      'wmapp_initialized'
    ];

    keysToRemove.forEach(key => storageManager.remove(key));
    console.log('[EnvironmentInitializer] Environment reset completed');
  }

  switchToProductionMode(): AppMode {
    const productionMode: AppMode = {
      mode: 'production',
      features: {
        enableSync: true,
        enableNotifications: true,
        enableGeolocation: true,
        enableDebugPanel: false,
        mockData: false
      },
      ui: {
        showModeBanner: false,
        allowDataExport: true,
        allowDataImport: false,
        enableDevTools: false
      }
    };

    storageManager.set('wmapp_mode', productionMode);
    return productionMode;
  }
}

// Singleton instance
export const environmentInitializer = new EnvironmentInitializer();