import React, { useState, useMemo } from 'react';
import { formatDate } from '../../services/dateUtils';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp,
  Filter,
  FileText,
  PieChart,
  Activity,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { useClockIns, useUsers, useStations, useLeaveRequests } from '../../hooks/useData';
import { legalFramework } from '../../services/legalFramework';

interface ReportFilters {
  startDate: string;
  endDate: string;
  userIds: string[];
  stationIds: string[];
  reportType: 'attendance' | 'overtime' | 'leaves' | 'productivity';
}

export function ReportsScreen() {
  const { state, showNotification } = useApp();
  const { data: clockIns } = useClockIns();
  const { data: users } = useUsers();
  const { data: stations } = useStations();
  const { data: leaveRequests } = useLeaveRequests();
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userIds: [],
    stationIds: [],
    reportType: 'attendance'
  });
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  const userRole = state.session?.user.role || 'employee';

  // Solo admin y manager pueden ver reportes
  if (userRole === 'employee') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">No tienes permisos para ver los reportes del sistema</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CÁLCULOS DE DATOS
  // ==========================================

  const reportData = useMemo(() => {
    if (!clockIns || !users || !stations) return null;

    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    
    // Filtrar datos por fecha
    const filteredClockIns = clockIns.filter(c => {
      const clockInDate = new Date(c.timestamp);
      return clockInDate >= startDate && clockInDate <= endDate;
    });

    const filteredLeaves = leaveRequests?.filter(l => {
      const leaveStart = new Date(l.startDate);
      const leaveEnd = new Date(l.endDate);
      return (leaveStart <= endDate && leaveEnd >= startDate) && l.status === 'approved';
    }) || [];

    // Estadísticas generales
    const totalClockIns = filteredClockIns.length;
    const uniqueUsers = new Set(filteredClockIns.map(c => c.userId)).size;
    const totalLeaves = filteredLeaves.length;
    
    // Calcular horas trabajadas
    const workingSessions = new Map<string, { in?: Date; out?: Date }>();
    
    filteredClockIns.forEach(clockIn => {
      const key = `${clockIn.userId}_${clockIn.timestamp.split('T')[0]}`;
      const session = workingSessions.get(key) || {};
      
      if (clockIn.type === 'in') {
        session.in = new Date(clockIn.timestamp);
      } else if (clockIn.type === 'out') {
        session.out = new Date(clockIn.timestamp);
      }
      
      workingSessions.set(key, session);
    });

    let totalHours = 0;
    let overtimeHours = 0;
    const standardWorkDay = 8; // 8 horas estándar

    workingSessions.forEach(session => {
      if (session.in && session.out) {
        const hours = (session.out.getTime() - session.in.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        if (hours > standardWorkDay) {
          overtimeHours += hours - standardWorkDay;
        }
      }
    });

    // Datos por usuario
    const userStats = users.map(user => {
      const userClockIns = filteredClockIns.filter(c => c.userId === user.id);
      const userLeaves = filteredLeaves.filter(l => l.userId === user.id);
      
      let userHours = 0;
      let userDays = 0;
      
      const userSessions = new Map<string, { in?: Date; out?: Date }>();
      userClockIns.forEach(clockIn => {
        const key = clockIn.timestamp.split('T')[0];
        const session = userSessions.get(key) || {};
        
        if (clockIn.type === 'in') {
          session.in = new Date(clockIn.timestamp);
        } else if (clockIn.type === 'out') {
          session.out = new Date(clockIn.timestamp);
        }
        
        userSessions.set(key, session);
      });

      userSessions.forEach(session => {
        if (session.in && session.out) {
          const hours = (session.out.getTime() - session.in.getTime()) / (1000 * 60 * 60);
          userHours += hours;
          userDays++;
        }
      });

      return {
        user,
        clockIns: userClockIns.length,
        hours: userHours,
        days: userDays,
        leaves: userLeaves.length,
        avgHoursPerDay: userDays > 0 ? userHours / userDays : 0
      };
    });

    // Datos por estación
    const stationStats = stations.map(station => {
      const stationClockIns = filteredClockIns.filter(c => c.stationId === station.id);
      const uniqueUsersAtStation = new Set(stationClockIns.map(c => c.userId)).size;
      
      return {
        station,
        clockIns: stationClockIns.length,
        uniqueUsers: uniqueUsersAtStation,
        usage: stationClockIns.length > 0 ? (stationClockIns.length / totalClockIns) * 100 : 0
      };
    });

    // Datos por día
    const dailyStats = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayClockIns = filteredClockIns.filter(c => c.timestamp.startsWith(dateStr));
      const dayUsers = new Set(dayClockIns.map(c => c.userId)).size;
      
      dailyStats.push({
        date: dateStr,
        clockIns: dayClockIns.length,
        users: dayUsers,
        dayName: formatDate(currentDate, state.session?.user.locale || 'es-ES')
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      summary: {
        totalClockIns,
        uniqueUsers,
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        totalLeaves,
        avgHoursPerUser: uniqueUsers > 0 ? Math.round((totalHours / uniqueUsers) * 100) / 100 : 0
      },
      userStats: userStats.sort((a, b) => b.hours - a.hours),
      stationStats: stationStats.sort((a, b) => b.clockIns - a.clockIns),
      dailyStats
    };
  }, [clockIns, users, stations, leaveRequests, filters]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (state.appMode.mode === 'demo') {
      showNotification({
        type: 'warning',
        title: 'Función deshabilitada',
        message: 'La exportación está deshabilitada en modo demo'
      });
      return;
    }
    if (!reportData) return;

    // Simular exportación
    const data = {
      filters,
      reportData,
      generatedAt: new Date().toISOString(),
      generatedBy: state.session?.user.firstName + ' ' + state.session?.user.lastName
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${filters.reportType}-${filters.startDate}-${filters.endDate}.${format === 'excel' ? 'xlsx' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification({
      type: 'success',
      title: 'Reporte exportado',
      message: `El reporte ha sido descargado en formato ${format.toUpperCase()}`,
      autoClose: true
    });

    setShowExportModal(false);
  };

  const handleGenerateLegalReport = () => {
    if (state.appMode.mode === 'demo') {
      showNotification({
        type: 'warning',
        title: 'Función deshabilitada',
        message: 'No disponible en modo demo'
      });
      return;
    }
    const weekStart = filters.startDate;
    const report = legalFramework.generateLegalReport(state.session!.company.id, weekStart);
    if (report) {
      showNotification({
        type: 'success',
        title: 'Informe legal generado',
        message: `Semana ${report.weekStart} - ${report.weekEnd}`,
        autoClose: true
      });
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar el informe'
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      userIds: [],
      stationIds: [],
      reportType: 'attendance'
    });
  };

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600">
            Analiza el rendimiento y la asistencia de tu equipo
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowExportModal(true)}
            icon={Download}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Exportar Reporte
          </Button>
          <Button
            onClick={handleGenerateLegalReport}
            icon={FileText}
            className="bg-green-600 hover:bg-green-700"
          >
            Informe Legal
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros de Reporte</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de reporte
              </label>
              <select
                value={filters.reportType}
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="attendance">Asistencia</option>
                <option value="overtime">Horas extra</option>
                <option value="leaves">Ausencias</option>
                <option value="productivity">Productividad</option>
              </select>
            </div>
            
            <Input
              label="Fecha inicio"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            
            <Input
              label="Fecha fin"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
            
            <div className="flex items-end">
              <Button
                onClick={resetFilters}
                variant="secondary"
                icon={Filter}
                fullWidth
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-lg p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Fichajes</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalClockIns}</p>
              <p className="text-xs text-gray-500">
                {Math.round(reportData.summary.totalClockIns / Math.max(1, (new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24)))} por día
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-green-100 rounded-lg p-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.uniqueUsers}</p>
              <p className="text-xs text-gray-500">
                {Math.round((reportData.summary.uniqueUsers / Math.max(1, users?.length || 1)) * 100)}% del total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-purple-100 rounded-lg p-3">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Horas Trabajadas</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalHours}h</p>
              <p className="text-xs text-gray-500">
                {reportData.summary.avgHoursPerUser}h promedio por usuario
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center space-x-4">
            <div className="bg-amber-100 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Horas Extra</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.overtimeHours}h</p>
              <p className="text-xs text-gray-500">
                {Math.round((reportData.summary.overtimeHours / Math.max(1, reportData.summary.totalHours)) * 100)}% del total
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de actividad diaria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Actividad Diaria</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Gráfico de barras</p>
                  <p className="text-sm text-gray-500">Fichajes por día</p>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-xs">
                {reportData.dailyStats.slice(-7).map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="font-medium text-gray-700">{day.dayName}</div>
                    <div className="text-gray-500">{day.clockIns}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (day.clockIns / Math.max(...reportData.dailyStats.map(d => d.clockIns))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Top Usuarios por Horas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.userStats.slice(0, 5).map((userStat, index) => (
                <div key={userStat.user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900">
                        {userStat.user.firstName} {userStat.user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {userStat.days} días trabajados
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {Math.round(userStat.hours * 100) / 100}h
                    </p>
                    <p className="text-sm text-gray-600">
                      {Math.round(userStat.avgHoursPerDay * 100) / 100}h/día
                    </p>
                  </div>
                </div>
              ))}
              
              {reportData.userStats.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No hay datos de usuarios</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uso de estaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Uso de Estaciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.stationStats.map((stationStat) => (
                <div key={stationStat.station.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{stationStat.station.name}</p>
                      <p className="text-sm text-gray-600">
                        {stationStat.uniqueUsers} usuarios únicos
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{stationStat.clockIns}</p>
                      <p className="text-sm text-gray-600">
                        {Math.round(stationStat.usage)}% uso
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, stationStat.usage)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              
              {reportData.stationStats.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No hay datos de estaciones</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumen de ausencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Resumen de Ausencias</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalLeaves}</p>
                  <p className="text-sm text-blue-800">Total Ausencias</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {leaveRequests?.filter(l => l.status === 'pending').length || 0}
                  </p>
                  <p className="text-sm text-green-800">Pendientes</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Por tipo:</h4>
                {['vacation', 'sick', 'personal'].map(type => {
                  const count = leaveRequests?.filter(l => 
                    l.type === type && 
                    l.status === 'approved' &&
                    new Date(l.startDate) >= new Date(filters.startDate) &&
                    new Date(l.endDate) <= new Date(filters.endDate)
                  ).length || 0;
                  
                  const label = type === 'vacation' ? 'Vacaciones' : 
                               type === 'sick' ? 'Baja médica' : 'Personal';
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{label}</span>
                      <Badge variant="info" size="sm">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de exportación */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar Reporte"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selecciona el formato de exportación
            </h3>
            <p className="text-gray-600">
              El reporte incluirá todos los datos filtrados del período seleccionado.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => handleExport('pdf')}
              variant="secondary"
              icon={FileText}
              fullWidth
              className="justify-start"
            >
              <div className="text-left">
                <p className="font-medium">PDF</p>
                <p className="text-sm text-gray-600">Reporte visual con gráficos</p>
              </div>
            </Button>
            
            <Button
              onClick={() => handleExport('excel')}
              variant="secondary"
              icon={BarChart3}
              fullWidth
              className="justify-start"
            >
              <div className="text-left">
                <p className="font-medium">Excel</p>
                <p className="text-sm text-gray-600">Datos tabulares para análisis</p>
              </div>
            </Button>
            
            <Button
              onClick={() => handleExport('csv')}
              variant="secondary"
              icon={Download}
              fullWidth
              className="justify-start"
            >
              <div className="text-left">
                <p className="font-medium">CSV</p>
                <p className="text-sm text-gray-600">Datos en formato texto plano</p>
              </div>
            </Button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Datos incluidos:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Resumen ejecutivo del período</li>
              <li>• Estadísticas por usuario</li>
              <li>• Uso de estaciones</li>
              <li>• Análisis de ausencias</li>
              <li>• Gráficos de tendencias</li>
            </ul>
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
    </div>
  );
}