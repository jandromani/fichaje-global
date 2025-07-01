import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ClockInScreen } from './components/screens/ClockInScreen';
import { UsersScreen } from './components/screens/UsersScreen';
import { StationsScreen } from './components/screens/StationsScreen';
import { LeavesScreen } from './components/screens/LeavesScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { LegalInfoScreen } from './components/screens/LegalInfoScreen';
import { LegalConsentModal } from './components/ui/LegalConsentModal';
import { getConsent, isConsentExpired } from './services/legalEngine';

// ==========================================
// COMPONENTE PRINCIPAL DE LA APLICACIÓN
// ==========================================

function AppContent() {
  const { state } = useApp();
  const [showConsent, setShowConsent] = React.useState(false);

  React.useEffect(() => {
    if (state.isAuthenticated) {
      const consent = getConsent(state.session!.user.id);
      if (!consent || isConsentExpired(consent)) {
        setShowConsent(true);
      }
    }
  }, [state.isAuthenticated, state.session]);

  // Mostrar loading durante inicialización
  if (state.loading && !state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Iniciando Sistema</h2>
          <p className="text-gray-600">Cargando configuración y datos...</p>
        </div>
      </div>
    );
  }

  // Mostrar login si no está autenticado
  if (!state.isAuthenticated) {
    return <LoginScreen />;
  }

  // Renderizar contenido según la pantalla actual
  const renderCurrentScreen = () => {
    switch (state.currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'clockins':
        return <ClockInScreen />;
      case 'users':
        return <UsersScreen />;
      case 'stations':
        return <StationsScreen />;
      case 'leaves':
        return <LeavesScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'legal':
        return <LegalInfoScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showConsent && state.session && (
        <LegalConsentModal workerId={state.session.user.id} onAccepted={() => setShowConsent(false)} />
      )}
      {/* Banner de modo de aplicación */}
      {state.appMode.ui.showModeBanner && (
        <div className={`w-full py-2 px-4 text-center text-sm font-medium ${getModeColors(state.appMode.mode)}`}>
          {getModeMessage(state.appMode.mode)}
        </div>
      )}

      <MainLayout>
        {renderCurrentScreen()}
      </MainLayout>

      {/* Notificaciones Toast */}
      {state.notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {state.notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm bg-white rounded-lg shadow-lg p-4 border-l-4 ${getNotificationColors(notification.type)}`}
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                </div>
                <button
                  onClick={() => {/* clearNotification(notification.id) */}}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// UTILIDADES DE UI
// ==========================================

function getModeColors(mode: string): string {
  switch (mode) {
    case 'demo':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'debug':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'production':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getModeMessage(mode: string): string {
  switch (mode) {
    case 'demo':
      return '🎯 MODO DEMO - Datos de prueba activos • Los cambios no se guardan permanentemente';
    case 'debug':
      return '🐛 MODO DEBUG - Herramientas de desarrollo activas • Solo para desarrollo';
    case 'production':
      return '🚀 MODO PRODUCCIÓN - Sistema en vivo';
    default:
      return '';
  }
}

function getNotificationColors(type: string): string {
  switch (type) {
    case 'success':
      return 'border-green-500';
    case 'error':
      return 'border-red-500';
    case 'warning':
      return 'border-amber-500';
    case 'info':
      return 'border-blue-500';
    default:
      return 'border-gray-500';
  }
}

// ==========================================
// COMPONENTE PRINCIPAL EXPORTADO
// ==========================================

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;