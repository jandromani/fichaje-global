import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../services/dateUtils';
import { 
  Clock, 
  Users, 
  Calendar, 
  TrendingUp, 
  MapPin, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { useClockIns, useUsers, useLeaveRequests, useStations } from '../../hooks/useData';

export function DashboardScreen() {
  const { state, navigateTo } = useApp();
  const { t, i18n } = useTranslation();
  const { data: clockIns, loading: clockInsLoading } = useClockIns();
  const { data: users, loading: usersLoading } = useUsers();
  const { data: leaveRequests, loading: leavesLoading } = useLeaveRequests();
  const { data: stations, loading: stationsLoading } = useStations();

  const userRole = state.session?.user.role || 'employee';
  const currentUserId = state.session?.user.id;

  // Calcular estadísticas
  const today = new Date().toISOString().split('T')[0];
  const todayClockIns = clockIns?.filter(c => c.timestamp.startsWith(today)) || [];
  const pendingLeaves = leaveRequests?.filter(l => l.status === 'pending') || [];
  const activeUsers = users?.filter(u => u.isActive) || [];
  const activeStations = stations?.filter(s => s.isActive) || [];

  // Estadísticas específicas por rol
  const userClockIns = userRole === 'employee' 
    ? clockIns?.filter(c => c.userId === currentUserId) || []
    : clockIns || [];

  const userLeaves = userRole === 'employee'
    ? leaveRequests?.filter(l => l.userId === currentUserId) || []
    : leaveRequests || [];

  const isLoading = clockInsLoading || usersLoading || leavesLoading || stationsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600">
            {t('dashboard.welcome', { firstName: state.session?.user.firstName, lastName: state.session?.user.lastName })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {formatDate(new Date(), i18n.language)}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Fichajes de Hoy */}
        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-lg p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'employee' ? t('dashboard.todayClockIns.user') : t('dashboard.todayClockIns.all')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {userRole === 'employee' 
                  ? todayClockIns.filter(c => c.userId === currentUserId).length
                  : todayClockIns.length
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Empleados Activos (solo admin/manager) */}
        {userRole !== 'employee' && (
          <Card hover>
            <CardContent className="flex items-center space-x-4">
              <div className="bg-green-100 rounded-lg p-3">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.activeEmployees')}</p>
                <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Solicitudes Pendientes */}
        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-amber-100 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'employee' ? t('dashboard.pendingLeaves') : t('dashboard.pendingLeaves')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {userRole === 'employee' 
                  ? userLeaves.filter(l => l.status === 'pending').length
                  : pendingLeaves.length
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estaciones Activas (solo admin/manager) */}
        {userRole !== 'employee' && (
          <Card hover>
            <CardContent className="flex items-center space-x-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estaciones Activas</p>
                <p className="text-2xl font-bold text-gray-900">{activeStations.length}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(userRole === 'employee' ? userClockIns : clockIns)?.slice(0, 5).map((clockIn) => {
                const user = users?.find(u => u.id === clockIn.userId);
                const station = stations?.find(s => s.id === clockIn.stationId);
                
                return (
                  <div key={clockIn.id} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      clockIn.type === 'in' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userRole === 'employee' ? 'Fichaje' : `${user?.firstName} ${user?.lastName}`}
                        <span className={`ml-2 ${
                          clockIn.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {clockIn.type === 'in' ? 'Entrada' : 'Salida'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {station?.name} • {new Date(clockIn.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {(userRole === 'employee' ? userClockIns : clockIns)?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay actividad reciente
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo('clockins')}
                fullWidth
              >
                Ver todos los fichajes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Solicitudes de Ausencia */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userRole === 'employee' ? 'Mis Solicitudes' : 'Solicitudes de Ausencia'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(userRole === 'employee' ? userLeaves : leaveRequests)?.slice(0, 5).map((leave) => {
                const user = users?.find(u => u.id === leave.userId);
                
                return (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userRole === 'employee' ? leave.type : `${user?.firstName} ${user?.lastName}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(new Date(leave.startDate), i18n.language)} - {formatDate(new Date(leave.endDate), i18n.language)}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        leave.status === 'approved' ? 'success' :
                        leave.status === 'rejected' ? 'danger' : 'warning'
                      }
                      size="sm"
                    >
                      {leave.status === 'approved' ? 'Aprobada' :
                       leave.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </Badge>
                  </div>
                );
              })}
              
              {(userRole === 'employee' ? userLeaves : leaveRequests)?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay solicitudes
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo('leaves')}
                fullWidth
              >
                {userRole === 'employee' ? 'Gestionar mis solicitudes' : 'Ver todas las solicitudes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="primary"
              icon={Clock}
              onClick={() => navigateTo('clockins')}
              fullWidth
            >
              Nuevo Fichaje
            </Button>
            
            <Button
              variant="secondary"
              icon={Calendar}
              onClick={() => navigateTo('leaves')}
              fullWidth
            >
              Solicitar Ausencia
            </Button>
            
            {userRole !== 'employee' && (
              <>
                <Button
                  variant="secondary"
                  icon={Users}
                  onClick={() => navigateTo('users')}
                  fullWidth
                >
                  Gestionar Empleados
                </Button>
                
                <Button
                  variant="secondary"
                  icon={TrendingUp}
                  onClick={() => navigateTo('reports')}
                  fullWidth
                >
                  Ver Reportes
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}