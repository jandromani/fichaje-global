import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Smartphone,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { storageManager } from '../../services/storageManager';
import { environmentInitializer } from '../../services/initializeDefaultEnvironment';
import { legalService } from '../../services/legalService';

export function SettingsScreen() {
  const { state, showNotification, switchAppMode, setTheme } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: state.session?.user.firstName || '',
    lastName: state.session?.user.lastName || '',
    email: state.session?.user.email || '',
    phoneNumber: state.session?.user.phoneNumber || '',
    department: state.session?.user.department || '',
    position: state.session?.user.position || ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    clockInReminders: true,
    leaveApprovals: true,
    systemUpdates: false,
    weeklyReports: true
  });

  const [appSettings, setAppSettings] = useState({
    language: 'es',
    timezone: state.session?.user.timezone || 'Europe/Madrid',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    theme: 'light'
  });

  const userRole = state.session?.user.role || 'employee';
  const currentUser = state.session?.user;

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSaveProfile = () => {
    // En una implementación real, esto actualizaría el perfil del usuario
    showNotification({
      type: 'success',
      title: 'Perfil actualizado',
      message: 'Los cambios en tu perfil han sido guardados correctamente',
      autoClose: true
    });
  };

  const handleSaveNotifications = () => {
    // Guardar configuración de notificaciones
    storageManager.set('notification_settings', notificationSettings);
    
    showNotification({
      type: 'success',
      title: 'Configuración guardada',
      message: 'Las preferencias de notificaciones han sido actualizadas',
      autoClose: true
    });
  };

  const handleSaveAppSettings = () => {
    // Guardar configuración de la aplicación
    storageManager.set('app_settings', appSettings);
    
    showNotification({
      type: 'success',
      title: 'Configuración guardada',
      message: 'Las preferencias de la aplicación han sido actualizadas',
      autoClose: true
    });
  };

  const handleExportData = (format: 'json' | 'csv') => {
    if (state.appMode.mode === 'demo') {
      showNotification({
        type: 'warning',
        title: 'Función deshabilitada',
        message: 'La exportación está deshabilitada en modo demo'
      });
      return;
    }
    try {
      const data = legalService.downloadUserData(state.session!.user.id);
      
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workforce-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification({
        type: 'success',
        title: 'Datos exportados',
        message: `Los datos han sido descargados en formato ${format.toUpperCase()}`,
        autoClose: true
      });
      
      setShowExportModal(false);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error de exportación',
        message: 'No se pudieron exportar los datos'
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (state.appMode.mode === 'demo') {
      showNotification({
        type: 'warning',
        title: 'Función deshabilitada',
        message: 'La importación está deshabilitada en modo demo'
      });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const success = storageManager.importData(data);
        
        if (success) {
          showNotification({
            type: 'success',
            title: 'Datos importados',
            message: 'Los datos han sido importados correctamente. Recarga la página para ver los cambios.',
            autoClose: true
          });
        } else {
          throw new Error('Import failed');
        }
      } catch (error) {
        showNotification({
          type: 'error',
          title: 'Error de importación',
          message: 'No se pudieron importar los datos. Verifica el formato del archivo.'
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleResetData = () => {
    environmentInitializer.resetEnvironment();
    
    showNotification({
      type: 'success',
      title: 'Datos reiniciados',
      message: 'Todos los datos han sido eliminados. Recarga la página para reinicializar.',
      autoClose: true
    });
    
    setShowResetModal(false);
    
    // Recargar la página después de un breve delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleChangePassword = () => {
    // En una implementación real, esto abriría un formulario de cambio de contraseña
    showNotification({
      type: 'info',
      title: 'Cambio de contraseña',
      message: 'Esta funcionalidad estará disponible en la versión completa',
      autoClose: true
    });
    setShowPasswordModal(false);
  };

  const handleDeleteAccount = () => {
    if (state.session) {
      legalService.deleteAccount(state.session.user.id);
    }
    showNotification({
      type: 'success',
      title: 'Cuenta eliminada',
      message: 'Tus datos locales se han borrado',
      autoClose: true
    });
    setShowDeleteModal(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  // ==========================================
  // TABS CONTENT
  // ==========================================

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-2xl">
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </span>
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {currentUser?.firstName} {currentUser?.lastName}
          </h3>
          <p className="text-gray-600">{currentUser?.position || currentUser?.role}</p>
          <Badge variant={
            currentUser?.role === 'admin' ? 'danger' :
            currentUser?.role === 'manager' ? 'warning' : 'info'
          }>
            {currentUser?.role === 'admin' ? 'Administrador' :
             currentUser?.role === 'manager' ? 'Manager' : 'Empleado'}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          value={profileData.firstName}
          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
        />
        
        <Input
          label="Apellidos"
          value={profileData.lastName}
          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
        />
        
        <Input
          label="Email"
          type="email"
          value={profileData.email}
          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
        />
        
        <Input
          label="Teléfono"
          value={profileData.phoneNumber}
          onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
        />
        
        <Input
          label="Departamento"
          value={profileData.department}
          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
        />
        
        <Input
          label="Posición"
          value={profileData.position}
          onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
        />
      </div>
      
      <div className="flex space-x-3">
        <Button onClick={handleSaveProfile} icon={Save}>
          Guardar Cambios
        </Button>
        
        <Button 
          onClick={() => setShowPasswordModal(true)}
          variant="secondary" 
          icon={Shield}
        >
          Cambiar Contraseña
        </Button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Preferencias de Notificación</h3>
        
        <div className="space-y-4">
          {Object.entries(notificationSettings).map(([key, value]) => {
            const labels = {
              emailNotifications: 'Notificaciones por email',
              pushNotifications: 'Notificaciones push',
              clockInReminders: 'Recordatorios de fichaje',
              leaveApprovals: 'Aprobaciones de ausencias',
              systemUpdates: 'Actualizaciones del sistema',
              weeklyReports: 'Reportes semanales'
            };
            
            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {labels[key as keyof typeof labels]}
                  </p>
                  <p className="text-sm text-gray-600">
                    {key === 'emailNotifications' && 'Recibe notificaciones en tu correo electrónico'}
                    {key === 'pushNotifications' && 'Notificaciones en tiempo real en el navegador'}
                    {key === 'clockInReminders' && 'Recordatorios para fichar entrada y salida'}
                    {key === 'leaveApprovals' && 'Notificaciones sobre el estado de tus solicitudes'}
                    {key === 'systemUpdates' && 'Información sobre actualizaciones y mantenimiento'}
                    {key === 'weeklyReports' && 'Resumen semanal de tu actividad'}
                  </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      [key]: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
      
      <Button onClick={handleSaveNotifications} icon={Save}>
        Guardar Preferencias
      </Button>
    </div>
  );

  const renderAppSettingsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Configuración de la Aplicación</h3>
        <Button onClick={() => setTheme(state.theme === 'light' ? 'dark' : 'light')} icon={Palette} variant="secondary">
          {state.theme === 'light' ? 'Activar modo oscuro' : 'Desactivar modo oscuro'}
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idioma
            </label>
            <select
              value={appSettings.language}
              onChange={(e) => setAppSettings({ ...appSettings, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona horaria
            </label>
            <select
              value={appSettings.timezone}
              onChange={(e) => setAppSettings({ ...appSettings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
              <option value="Europe/London">Londres (GMT+0)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
              <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formato de fecha
            </label>
            <select
              value={appSettings.dateFormat}
              onChange={(e) => setAppSettings({ ...appSettings, dateFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formato de hora
            </label>
            <select
              value={appSettings.timeFormat}
              onChange={(e) => setAppSettings({ ...appSettings, timeFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">24 horas</option>
              <option value="12h">12 horas (AM/PM)</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Modo de Aplicación</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['demo', 'production', 'debug'] as const).map((mode) => (
            <Card 
              key={mode}
              className={`cursor-pointer transition-all ${
                state.appMode.mode === mode ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => switchAppMode(mode)}
            >
              <CardContent className="text-center">
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  mode === 'demo' ? 'bg-blue-100' :
                  mode === 'production' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {mode === 'demo' && <Smartphone className="w-6 h-6 text-blue-600" />}
                  {mode === 'production' && <Globe className="w-6 h-6 text-green-600" />}
                  {mode === 'debug' && <Settings className="w-6 h-6 text-red-600" />}
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-1">
                  {mode === 'demo' ? 'Demo' :
                   mode === 'production' ? 'Producción' : 'Debug'}
                </h4>
                
                <p className="text-sm text-gray-600">
                  {mode === 'demo' && 'Datos de prueba y funcionalidades limitadas'}
                  {mode === 'production' && 'Entorno de producción completo'}
                  {mode === 'debug' && 'Herramientas de desarrollo activas'}
                </p>
                
                {state.appMode.mode === mode && (
                  <Badge variant="success" size="sm" className="mt-2">
                    Activo
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <Button onClick={handleSaveAppSettings} icon={Save}>
        Guardar Configuración
      </Button>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Gestión de Datos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Exportar Datos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Descarga una copia de todos tus datos del sistema.
              </p>
              
              <Button
                onClick={() => setShowExportModal(true)}
                icon={Download}
                fullWidth
              >
                Exportar Datos
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Importar Datos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Importa datos desde un archivo de respaldo.
              </p>
              
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                id="import-file"
              />
              
              <Button
                onClick={() => document.getElementById('import-file')?.click()}
                icon={Upload}
                variant="secondary"
                fullWidth
              >
                Seleccionar Archivo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5" />
                <span>Borrar Cuenta</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Elimina tu cuenta y borra todos los datos locales asociados.
              </p>

              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="danger"
                icon={Trash2}
                fullWidth
              >
                Borrar Mi Cuenta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Zona de Peligro</h3>
          
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                <span>Reiniciar Datos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Elimina todos los datos del sistema y reinicia el entorno demo.
                <strong className="text-red-600"> Esta acción no se puede deshacer.</strong>
              </p>
              
              <Button
                onClick={() => setShowResetModal(true)}
                variant="danger"
                icon={Trash2}
              >
                Reiniciar Sistema
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'app', label: 'Aplicación', icon: Settings },
    { id: 'data', label: 'Datos', icon: Download }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">
          Gestiona tu perfil, preferencias y configuración del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent>
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'app' && renderAppSettingsTab()}
          {activeTab === 'data' && renderDataTab()}
        </CardContent>
      </Card>

      {/* Modal de confirmación de reset */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirmar Reinicio"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 rounded-full p-2">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                ¿Estás seguro?
              </h3>
              <p className="text-gray-600">
                Esta acción eliminará todos los datos del sistema.
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">Se eliminarán:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Todos los usuarios y perfiles</li>
              <li>• Historial de fichajes</li>
              <li>• Solicitudes de ausencia</li>
              <li>• Configuración de estaciones</li>
              <li>• Notificaciones y reportes</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowResetModal(false)}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetData}
              variant="danger"
              icon={Trash2}
            >
              Sí, reiniciar todo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de exportación */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar Datos"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Selecciona el formato para exportar tus datos:
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => handleExportData('json')}
              variant="secondary"
              icon={Download}
              fullWidth
              className="justify-start"
            >
              <div className="text-left">
                <p className="font-medium">JSON</p>
                <p className="text-sm text-gray-600">Formato estructurado para respaldo completo</p>
              </div>
            </Button>
            
            <Button
              onClick={() => handleExportData('csv')}
              variant="secondary"
              icon={Download}
              fullWidth
              className="justify-start"
            >
              <div className="text-left">
                <p className="font-medium">CSV</p>
                <p className="text-sm text-gray-600">Formato de tabla para análisis en Excel</p>
              </div>
            </Button>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowExportModal(false)}
              variant="secondary"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de cambio de contraseña */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Cambiar Contraseña"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cambio de Contraseña
            </h3>
            <p className="text-gray-600">
              Esta funcionalidad estará disponible en la versión completa del sistema.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">En la versión completa podrás:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Cambiar tu contraseña actual</li>
              <li>• Configurar autenticación de dos factores</li>
              <li>• Ver historial de inicios de sesión</li>
              <li>• Gestionar sesiones activas</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowPasswordModal(false)}
              variant="secondary"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleChangePassword}
              icon={Shield}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Cuenta"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Seguro que deseas eliminar tu cuenta y todos los datos locales?
          </p>
          <div className="flex justify-end space-x-3">
            <Button onClick={() => setShowDeleteModal(false)} variant="secondary">
              Cancelar
            </Button>
            <Button onClick={handleDeleteAccount} variant="danger" icon={Trash2}>
              Borrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}