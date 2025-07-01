import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, Building2, Users, Shield, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { useApp } from '../../contexts/AppContext';
import { initializeDefaultEnvironment } from '../../services/initializeDefaultEnvironment';

export function LoginScreen() {
  const { login, state, showNotification } = useApp();
  const [isInitializing, setIsInitializing] = useState(false);
  const { t } = useTranslation();

  const handleDemoLogin = async () => {
    try {
      setIsInitializing(true);
      
      console.log('[LoginScreen] Starting demo login...');
      
      // Inicializar entorno demo si es necesario
      const initResult = await initializeDefaultEnvironment();
      
      console.log('[LoginScreen] Init result:', initResult);
      
      if (!initResult.success) {
        showNotification({
          type: 'error',
          title: 'Error de Inicialización',
          message: 'No se pudo inicializar el entorno demo'
        });
        return;
      }

      // Login automático como admin
      console.log('[LoginScreen] Attempting login...');
      const success = await login('admin@demo.com', 'hello');
      
      console.log('[LoginScreen] Login result:', success);
      
      if (!success) {
        showNotification({
          type: 'error',
          title: 'Error de Login',
          message: 'No se pudo acceder al sistema'
        });
      } else {
        showNotification({
          type: 'success',
          title: '¡Bienvenido al Demo!',
          message: 'Has accedido como administrador',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('[LoginScreen] Demo login error:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error inesperado durante la inicialización'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Features */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="bg-blue-600 rounded-xl p-3">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Workforce Management
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-lg">
              Sistema completo de gestión laboral con fichajes QR, control de ausencias y reportes avanzados
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-lg p-2">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fichajes QR</h3>
                <p className="text-sm text-gray-600">Control de entrada y salida con códigos QR seguros</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gestión de Personal</h3>
                <p className="text-sm text-gray-600">Administra empleados, horarios y permisos</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-amber-100 rounded-lg p-2">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Modo Offline</h3>
                <p className="text-sm text-gray-600">Funciona sin conexión, sincroniza automáticamente</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Multi-empresa</h3>
                <p className="text-sm text-gray-600">Soporte para múltiples empresas y ubicaciones</p>
              </div>
            </div>
          </div>

          {/* Demo Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Modo Demo Disponible</span>
            </div>
            <p className="text-sm text-blue-700">
              Explora todas las funcionalidades con datos de prueba. 
              No se requiere configuración adicional.
            </p>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">{t('login.title')}</h2>
                <p className="text-gray-600">
                  {t('login.subtitle')}
                </p>
              </div>

              {/* Demo Login Button */}
              <div className="space-y-4">
                <Button
                  onClick={handleDemoLogin}
                  loading={isInitializing || state.loading}
                  icon={LogIn}
                  size="lg"
                  fullWidth
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isInitializing || state.loading}
                >
                  {isInitializing ? 'Inicializando Demo...' : t('button.demoLogin')}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Al hacer clic accederás como administrador con datos de prueba
                  </p>
                </div>
              </div>

              {/* Demo Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">¿Qué incluye el demo?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Empresa con 4 empleados de ejemplo</li>
                  <li>• 2 estaciones de fichaje configuradas</li>
                  <li>• Historial de fichajes de la última semana</li>
                  <li>• Solicitudes de ausencia de prueba</li>
                  <li>• Notificaciones y reportes demo</li>
                </ul>
              </div>

              {/* Production Note */}
              <div className="border-t pt-4">
                <p className="text-xs text-center text-gray-500">
                  Para uso en producción, contacta con el administrador del sistema
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}