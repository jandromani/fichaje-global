import React from 'react';
import { 
  Home, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  BarChart3,
  QrCode,
  Settings,
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../contexts/AppContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { state, logout, navigateTo, clearAllNotifications } = useApp();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', icon: Home, screen: 'dashboard', roles: ['admin', 'manager', 'employee'] },
    { name: 'Fichajes', icon: Clock, screen: 'clockins', roles: ['admin', 'manager', 'employee'] },
    { name: 'Empleados', icon: Users, screen: 'users', roles: ['admin', 'manager'] },
    { name: 'Estaciones', icon: MapPin, screen: 'stations', roles: ['admin', 'manager'] },
    { name: 'Ausencias', icon: Calendar, screen: 'leaves', roles: ['admin', 'manager', 'employee'] },
    { name: 'Reportes', icon: BarChart3, screen: 'reports', roles: ['admin', 'manager'] },
    { name: 'QR Designer', icon: QrCode, screen: 'qrdesigner', roles: ['admin', 'manager'] },
    { name: 'Configuración', icon: Settings, screen: 'settings', roles: ['admin', 'manager', 'employee'] },
  ];

  const userRole = state.session?.user.role || 'employee';
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));
  const unreadNotifications = state.notifications.filter(n => !n.isRead).length;

  const handleNavigation = (screen: string) => {
    navigateTo(screen);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed positioning */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">WM System</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = state.currentScreen === item.screen;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.screen)}
                  className={`
                    w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {state.session?.user.firstName?.[0]}{state.session?.user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {state.session?.user.firstName} {state.session?.user.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {state.session?.user.role}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={LogOut}
              onClick={logout}
              fullWidth
              className="text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                icon={Menu}
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {state.currentCompany?.name || 'Workforce Management'}
                </h1>
                {state.appMode.mode === 'demo' && (
                  <Badge variant="info" size="sm">DEMO</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Online/Offline indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {state.isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>

              {/* Sync status */}
              {state.syncStatus.pendingCount > 0 && (
                <div className="flex items-center space-x-2 text-amber-600">
                  <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm hidden sm:inline">
                    {state.syncStatus.pendingCount} pendiente{state.syncStatus.pendingCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Bell}
                  onClick={() => navigateTo('notifications')}
                  className="relative"
                />
                {unreadNotifications > 0 && (
                  <Badge 
                    variant="danger" 
                    size="sm"
                    className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}