import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Clock, 
  Users, 
  MapPin, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LanguageSelector } from '../ui/LanguageSelector';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { state, logout, navigateTo, clearAllNotifications, setRegionCode } = useApp();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), icon: Home, screen: 'dashboard', roles: ['admin', 'manager', 'employee'] },
    { name: t('nav.clockins'), icon: Clock, screen: 'clockins', roles: ['admin', 'manager', 'employee'] },
    { name: t('nav.users'), icon: Users, screen: 'users', roles: ['admin', 'manager'] },
    { name: t('nav.stations'), icon: MapPin, screen: 'stations', roles: ['admin', 'manager'] },
    { name: t('nav.leaves'), icon: Calendar, screen: 'leaves', roles: ['admin', 'manager', 'employee'] },
    { name: t('nav.reports'), icon: BarChart3, screen: 'reports', roles: ['admin', 'manager'] },
    { name: t('nav.settings'), icon: Settings, screen: 'settings', roles: ['admin', 'manager', 'employee'] },
  ];

  const userRole = state.session?.user.role || 'employee';
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));
  const unreadNotifications = state.notifications.filter(n => !n.isRead).length;

  const handleNavigation = (screen: string) => {
    navigateTo(screen);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed positioning */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">WM System</span>
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
                      ? 'bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-white border-r-2 border-blue-600 shadow-sm'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {state.session?.user.firstName?.[0]}{state.session?.user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {state.session?.user.firstName} {state.session?.user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
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
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-800"
            >
              {t('button.logout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
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
                  {state.currentCompany?.name || t('app.title')}
                </h1>
                {state.appMode.mode !== 'production' && (
                  <Badge
                    variant={state.appMode.mode === 'debug' ? 'danger' : 'info'}
                    size="sm"
                  >
                    {state.appMode.mode.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Online/Offline indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {state.isOnline ? t('status.online') : t('status.offline')}
                </span>
              </div>

              {/* Region selector */}
              <div className="flex items-center space-x-2">
                <img
                  src={`https://flagcdn.com/w20/${state.regionCode.toLowerCase()}.png`}
                  alt={state.regionCode}
                  className="w-5 h-3"
                />
                <select
                  value={state.regionCode}
                  onChange={(e) => setRegionCode(e.target.value)}
                  className="text-sm border rounded px-1 py-0.5"
                >
                  {Object.keys(regionConfig).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              {/* Sync status */}
              {state.syncStatus.pendingCount > 0 && (
                <div className="flex items-center space-x-2 text-amber-600">
                  <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm hidden sm:inline dark:text-amber-400">
                    {state.syncStatus.pendingCount} pendiente{state.syncStatus.pendingCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                icon={theme === 'dark' ? Sun : Moon}
                onClick={toggleTheme}
              />

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

              <LanguageSelector />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}