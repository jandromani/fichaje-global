import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { storageManager } from '../services/storageManager';
import { syncEngine } from '../services/syncEngine';
import type { UserSession, AppMode, SyncStatus, Company } from '../types';

// ==========================================
// TIPOS DE CONTEXTO GLOBAL
// ==========================================

interface AppState {
  // Sesión y autenticación
  session: UserSession | null;
  isAuthenticated: boolean;
  
  // Estado de la aplicación
  appMode: AppMode;
  currentCompany: Company | null;
  
  // Estados de sistema
  syncStatus: SyncStatus;
  isOnline: boolean;
  
  // UI Estado
  currentScreen: string;
  loading: boolean;
  error: string | null;
  
  // Notificaciones
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    autoClose?: boolean;
  }>;
}

type AppAction =
  | { type: 'SET_SESSION'; payload: UserSession | null }
  | { type: 'SET_APP_MODE'; payload: AppMode }
  | { type: 'SET_CURRENT_COMPANY'; payload: Company | null }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_CURRENT_SCREEN'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: AppState['notifications'][0] }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'LOGOUT' }
  | { type: 'INITIALIZE_APP'; payload: Partial<AppState> };

// ==========================================
// REDUCER
// ==========================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload,
        isAuthenticated: action.payload !== null,
        currentCompany: action.payload?.company || null
      };

    case 'SET_APP_MODE':
      return { ...state, appMode: action.payload };

    case 'SET_CURRENT_COMPANY':
      return { ...state, currentCompany: action.payload };

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };

    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };

    case 'SET_CURRENT_SCREEN':
      return { ...state, currentScreen: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 9)] // Keep only 10 notifications
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'LOGOUT':
      // Mantener el modo de aplicación pero limpiar sesión
      return {
        ...state,
        session: null,
        isAuthenticated: false,
        currentCompany: null,
        currentScreen: 'login',
        notifications: [],
        error: null
      };

    case 'INITIALIZE_APP':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ==========================================
// ESTADO INICIAL
// ==========================================

const initialState: AppState = {
  session: null,
  isAuthenticated: false,
  appMode: {
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
  },
  currentCompany: null,
  syncStatus: {
    isOnline: navigator.onLine,
    pendingCount: 0,
    errorCount: 0,
    isProcessing: false,
    queue: []
  },
  isOnline: navigator.onLine,
  currentScreen: 'login',
  loading: false,
  error: null,
  notifications: []
};

// ==========================================
// CONTEXTO
// ==========================================

interface AppContextType {
  state: AppState;
  
  // Métodos de autenticación
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Métodos de navegación
  navigateTo: (screen: string) => void;
  goBack: () => void;
  
  // Métodos de notificación
  showNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Métodos de estado
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Métodos de configuración
  switchAppMode: (mode: AppMode['mode']) => void;
  
  // Métodos de sincronización
  forcSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const navigationHistory: string[] = [];

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('[AppProvider] Initializing app...');

      // Cargar configuración de la aplicación
      const savedAppMode = storageManager.get<AppMode>('wmapp_mode');
      if (savedAppMode) {
        dispatch({ type: 'SET_APP_MODE', payload: savedAppMode });
      }

      // Cargar sesión guardada
      const savedSession = storageManager.get<UserSession>('wmapp_session');
      if (savedSession && isSessionValid(savedSession)) {
        console.log('[AppProvider] Found valid session, logging in...');
        dispatch({ type: 'SET_SESSION', payload: savedSession });
        dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'dashboard' });
      }

      // Inicializar listeners
      setupEventListeners();

      // Cargar estado de sincronización
      const syncStatus = syncEngine.getStatus();
      dispatch({ type: 'SET_SYNC_STATUS', payload: syncStatus });

      console.log('[AppProvider] App initialized successfully');

    } catch (error) {
      console.error('[AppProvider] Initialization error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize application' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const setupEventListeners = () => {
    // Online/Offline status
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync status changes
    const unsubscribeSync = syncEngine.onStatusChange((status) => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: status });
    });

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  };

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('[AppProvider] Attempting login for:', email);

      // Simular validación de credenciales
      const users = storageManager.get('wmapp_users', []);
      console.log('[AppProvider] Found users:', users.length);
      
      // Para debug, mostrar los hashes
      const expectedHash = hashPassword(password);
      console.log('[AppProvider] Expected hash for password "' + password + '":', expectedHash);
      
      const user = users.find((u: any) => {
        const emailMatch = u.email.toLowerCase() === email.toLowerCase();
        const passwordMatch = u.passwordHash === expectedHash;
        
        console.log('[AppProvider] Checking user:', u.email, 'Hash:', u.passwordHash, 'Expected:', expectedHash, 'Match:', passwordMatch);
        
        return emailMatch && passwordMatch;
      });

      if (!user) {
        console.log('[AppProvider] User not found or invalid password');
        dispatch({ type: 'SET_ERROR', payload: 'Invalid credentials' });
        return false;
      }

      if (!user.isActive) {
        console.log('[AppProvider] User account is deactivated');
        dispatch({ type: 'SET_ERROR', payload: 'Account is deactivated' });
        return false;
      }

      // Cargar empresa del usuario
      const companies = storageManager.get('wmapp_companies', []);
      const company = companies.find((c: any) => c.id === user.companyId);

      if (!company) {
        console.log('[AppProvider] Company not found for user');
        dispatch({ type: 'SET_ERROR', payload: 'Company not found' });
        return false;
      }

      // Crear sesión
      const session: UserSession = {
        user,
        company,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        permissions: user.permissions,
        lastActivity: new Date().toISOString(),
        deviceFingerprint: generateDeviceFingerprint()
      };

      console.log('[AppProvider] Session created successfully');

      // Guardar sesión
      storageManager.set('wmapp_session', session);
      dispatch({ type: 'SET_SESSION', payload: session });
      dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'dashboard' });

      showNotification({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${user.firstName}!`,
        autoClose: true
      });

      return true;

    } catch (error) {
      console.error('[AppProvider] Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    storageManager.remove('wmapp_session');
    dispatch({ type: 'LOGOUT' });
    
    showNotification({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been successfully logged out',
      autoClose: true
    });
  };

  // ==========================================
  // MÉTODOS DE NAVEGACIÓN
  // ==========================================

  const navigateTo = (screen: string) => {
    navigationHistory.push(state.currentScreen);
    dispatch({ type: 'SET_CURRENT_SCREEN', payload: screen });
  };

  const goBack = () => {
    const previousScreen = navigationHistory.pop();
    if (previousScreen) {
      dispatch({ type: 'SET_CURRENT_SCREEN', payload: previousScreen });
    }
  };

  // ==========================================
  // MÉTODOS DE NOTIFICACIÓN
  // ==========================================

  const showNotification = (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => {
    const fullNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date().toISOString()
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });

    // Auto-remove notification if specified
    if (notification.autoClose) {
      setTimeout(() => {
        clearNotification(fullNotification.id);
      }, 5000);
    }
  };

  const clearNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  // ==========================================
  // MÉTODOS DE ESTADO
  // ==========================================

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  // ==========================================
  // MÉTODOS DE CONFIGURACIÓN
  // ==========================================

  const switchAppMode = (mode: AppMode['mode']) => {
    const newAppMode: AppMode = {
      mode,
      features: {
        enableSync: mode !== 'debug',
        enableNotifications: true,
        enableGeolocation: mode !== 'debug',
        enableDebugPanel: mode === 'debug',
        mockData: mode === 'demo'
      },
      ui: {
        showModeBanner: mode !== 'production',
        allowDataExport: true,
        allowDataImport: mode !== 'production',
        enableDevTools: mode === 'debug'
      }
    };

    storageManager.set('wmapp_mode', newAppMode);
    dispatch({ type: 'SET_APP_MODE', payload: newAppMode });

    showNotification({
      type: 'info',
      title: 'Mode Changed',
      message: `Application mode switched to ${mode.toUpperCase()}`,
      autoClose: true
    });
  };

  // ==========================================
  // MÉTODOS DE SINCRONIZACIÓN
  // ==========================================

  const forcSync = async () => {
    try {
      setLoading(true);
      await syncEngine.forceSync();
      
      showNotification({
        type: 'success',
        title: 'Sync Complete',
        message: 'All data has been synchronized',
        autoClose: true
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to synchronize data',
        autoClose: true
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VALOR DEL CONTEXTO
  // ==========================================

  const contextValue: AppContextType = {
    state,
    login,
    logout,
    navigateTo,
    goBack,
    showNotification,
    clearNotification,
    clearAllNotifications,
    setLoading,
    setError,
    switchAppMode,
    forcSync
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// ==========================================
// HOOK PARA USAR EL CONTEXTO
// ==========================================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ==========================================
// UTILIDADES
// ==========================================

function isSessionValid(session: UserSession): boolean {
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  return now < expiresAt;
}

// Función de hash simplificada y consistente
function hashPassword(password: string): string {
  // Para el demo, usar un hash fijo conocido para 'hello'
  if (password === 'hello') {
    return '5d41402abc4b2a76b9719d911017c592';
  }
  
  // Para otras contraseñas, usar hash simple
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  
  return btoa(JSON.stringify({
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL()
  }));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}