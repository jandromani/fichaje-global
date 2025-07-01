import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { useLeaveRequests, useUsers } from '../../hooks/useData';
import type { LeaveRequest } from '../../types';

export function LeavesScreen() {
  const { state, showNotification } = useApp();
  const { 
    data: leaveRequests, 
    loading, 
    create: createLeaveRequest, 
    update: updateLeaveRequest,
    filter,
    setFilter,
    pagination,
    setPage,
    nextPage,
    prevPage
  } = useLeaveRequests();
  
  const { data: users } = useUsers();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({});

  const userRole = state.session?.user.role || 'employee';
  const currentUserId = state.session?.user.id;

  // Filtrar solicitudes según el rol
  const filteredRequests = userRole === 'employee' 
    ? leaveRequests?.filter(req => req.userId === currentUserId)
    : leaveRequests;

  // ==========================================
  // HANDLERS DE FORMULARIO
  // ==========================================

  const handleCreateRequest = async () => {
    if (!formData.type || !formData.startDate || !formData.endDate || !formData.reason) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Completa todos los campos obligatorios'
      });
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (endDate < startDate) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
      return;
    }

    // Calcular días totales
    const timeDiff = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const newRequest = {
      ...formData,
      userId: currentUserId!,
      totalDays: formData.isHalfDay ? 0.5 : totalDays,
      status: 'pending' as const,
      urgency: formData.urgency || 'medium',
      isHalfDay: formData.isHalfDay || false
    };

    const result = await createLeaveRequest(newRequest);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Solicitud creada',
        message: 'Tu solicitud de ausencia ha sido enviada para aprobación',
        autoClose: true
      });
      setShowCreateModal(false);
      setFormData({});
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo crear la solicitud'
      });
    }
  };

  const handleApproveRequest = async (request: LeaveRequest) => {
    const result = await updateLeaveRequest(request.id, {
      status: 'approved',
      approvedBy: currentUserId,
      approvedAt: new Date().toISOString()
    });
    
    if (result) {
      const user = users?.find(u => u.id === request.userId);
      showNotification({
        type: 'success',
        title: 'Solicitud aprobada',
        message: `Solicitud de ${user?.firstName} ${user?.lastName} aprobada`,
        autoClose: true
      });
    }
  };

  const handleRejectRequest = async (request: LeaveRequest, reason?: string) => {
    const result = await updateLeaveRequest(request.id, {
      status: 'rejected',
      approvedBy: currentUserId,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason || 'No especificado'
    });
    
    if (result) {
      const user = users?.find(u => u.id === request.userId);
      showNotification({
        type: 'warning',
        title: 'Solicitud rechazada',
        message: `Solicitud de ${user?.firstName} ${user?.lastName} rechazada`,
        autoClose: true
      });
    }
  };

  const handleCancelRequest = async (request: LeaveRequest) => {
    if (request.status !== 'pending') {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Solo se pueden cancelar solicitudes pendientes'
      });
      return;
    }

    const confirmed = window.confirm('¿Estás seguro de que quieres cancelar esta solicitud?');
    
    if (confirmed) {
      const result = await updateLeaveRequest(request.id, {
        status: 'cancelled'
      });
      
      if (result) {
        showNotification({
          type: 'success',
          title: 'Solicitud cancelada',
          message: 'Tu solicitud ha sido cancelada',
          autoClose: true
        });
      }
    }
  };

  // ==========================================
  // UTILIDADES
  // ==========================================

  const getLeaveTypeLabel = (type: string) => {
    const types = {
      vacation: 'Vacaciones',
      sick: 'Baja médica',
      personal: 'Asunto personal',
      maternity: 'Maternidad',
      bereavement: 'Duelo',
      unpaid: 'Sin sueldo'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'cancelled': return 'default';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      cancelled: 'Cancelada'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'danger';
      case 'emergency': return 'danger';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const openViewModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === 'employee' ? 'Mis Solicitudes de Ausencia' : 'Gestión de Ausencias'}
          </h1>
          <p className="text-gray-600">
            {userRole === 'employee' 
              ? 'Gestiona tus solicitudes de vacaciones y ausencias'
              : 'Revisa y aprueba las solicitudes de ausencia del equipo'
            }
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={Plus}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Nueva Solicitud
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-amber-100 rounded-lg p-2">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredRequests?.filter(r => r.status === 'pending').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-lg p-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Aprobadas</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredRequests?.filter(r => r.status === 'approved').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-red-100 rounded-lg p-2">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Rechazadas</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredRequests?.filter(r => r.status === 'rejected').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total días</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredRequests?.reduce((sum, r) => sum + (r.status === 'approved' ? r.totalDays : 0), 0) || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar solicitudes..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              icon={Search}
            />
            
            <select
              value={filter.status?.[0] || ''}
              onChange={(e) => setFilter({ 
                ...filter, 
                status: e.target.value ? [e.target.value] : [] 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            
            <select
              value={filter.type?.[0] || ''}
              onChange={(e) => setFilter({ 
                ...filter, 
                type: e.target.value ? [e.target.value] : [] 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="vacation">Vacaciones</option>
              <option value="sick">Baja médica</option>
              <option value="personal">Asunto personal</option>
              <option value="maternity">Maternidad</option>
              <option value="bereavement">Duelo</option>
              <option value="unpaid">Sin sueldo</option>
            </select>
            
            <Button
              onClick={() => setFilter({ search: '', dateRange: {}, status: [], type: [] })}
              variant="secondary"
              icon={Filter}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de solicitudes */}
      <div className="space-y-4">
        {filteredRequests?.map((request) => {
          const user = users?.find(u => u.id === request.userId);
          const approver = request.approvedBy ? users?.find(u => u.id === request.approvedBy) : null;
          
          return (
            <Card key={request.id} hover>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          {userRole !== 'employee' && user && (
                            <div className="flex items-center space-x-2">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-sm font-semibold">
                                    {user.firstName[0]}{user.lastName[0]}
                                  </span>
                                </div>
                              )}
                              <span className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </span>
                            </div>
                          )}
                          
                          <Badge variant={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          
                          <Badge variant={getUrgencyColor(request.urgency)}>
                            {request.urgency === 'high' ? 'Alta' :
                             request.urgency === 'emergency' ? 'Urgente' :
                             request.urgency === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mt-2">
                          {getLeaveTypeLabel(request.type)}
                        </h3>
                        
                        <p className="text-gray-600">{request.reason}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fechas:</span>
                        <p>
                          {new Date(request.startDate).toLocaleDateString('es-ES')} - {new Date(request.endDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Duración:</span>
                        <p>{request.totalDays} día{request.totalDays !== 1 ? 's' : ''}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Solicitado:</span>
                        <p>{new Date(request.createdAt).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    
                    {request.approvedAt && approver && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {request.status === 'approved' ? 'Aprobado' : 'Rechazado'} por:
                        </span>
                        <span className="ml-1">
                          {approver.firstName} {approver.lastName} el {new Date(request.approvedAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                    
                    {request.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          <strong>Motivo del rechazo:</strong> {request.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      onClick={() => openViewModal(request)}
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                    >
                      Ver
                    </Button>
                    
                    {/* Acciones para administradores/managers */}
                    {userRole !== 'employee' && request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApproveRequest(request)}
                          variant="success"
                          size="sm"
                          icon={Check}
                        >
                          Aprobar
                        </Button>
                        
                        <Button
                          onClick={() => handleRejectRequest(request)}
                          variant="danger"
                          size="sm"
                          icon={X}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                    
                    {/* Acciones para empleados */}
                    {userRole === 'employee' && request.status === 'pending' && (
                      <Button
                        onClick={() => handleCancelRequest(request)}
                        variant="secondary"
                        size="sm"
                        icon={X}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {(!filteredRequests || filteredRequests.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No hay solicitudes de ausencia
            </h2>
            <p className="text-gray-600 mb-4">
              {userRole === 'employee' 
                ? 'Crea tu primera solicitud de ausencia'
                : 'No hay solicitudes pendientes de revisión'
              }
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              icon={Plus}
            >
              Nueva Solicitud
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paginación */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} solicitudes
          </p>
          
          <div className="flex space-x-2">
            <Button
              onClick={prevPage}
              disabled={!pagination.hasPrev}
              variant="secondary"
              size="sm"
            >
              Anterior
            </Button>
            
            <Button
              onClick={nextPage}
              disabled={!pagination.hasNext}
              variant="secondary"
              size="sm"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal Crear Solicitud */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
        }}
        title="Nueva Solicitud de Ausencia"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de ausencia *
            </label>
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un tipo</option>
              <option value="vacation">Vacaciones</option>
              <option value="sick">Baja médica</option>
              <option value="personal">Asunto personal</option>
              <option value="maternity">Maternidad</option>
              <option value="bereavement">Duelo</option>
              <option value="unpaid">Sin sueldo</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio *"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            
            <Input
              label="Fecha de fin *"
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isHalfDay"
              checked={formData.isHalfDay || false}
              onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isHalfDay" className="text-sm text-gray-700">
              Media jornada
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgencia
            </label>
            <select
              value={formData.urgency || 'medium'}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="emergency">Urgente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo *
            </label>
            <textarea
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe el motivo de tu solicitud..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setFormData({});
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateRequest}>
              Crear Solicitud
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Solicitud */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedRequest(null);
        }}
        title="Detalles de la Solicitud"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {getLeaveTypeLabel(selectedRequest.type)}
                </h3>
                <p className="text-gray-600 mt-1">{selectedRequest.reason}</p>
              </div>
              
              <div className="flex space-x-2">
                <Badge variant={getStatusColor(selectedRequest.status)}>
                  {getStatusLabel(selectedRequest.status)}
                </Badge>
                <Badge variant={getUrgencyColor(selectedRequest.urgency)}>
                  {selectedRequest.urgency === 'high' ? 'Alta' :
                   selectedRequest.urgency === 'emergency' ? 'Urgente' :
                   selectedRequest.urgency === 'medium' ? 'Media' : 'Baja'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Información de la Solicitud</h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Fecha de inicio:</span>
                    <p>{new Date(selectedRequest.startDate).toLocaleDateString('es-ES')}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Fecha de fin:</span>
                    <p>{new Date(selectedRequest.endDate).toLocaleDateString('es-ES')}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Duración:</span>
                    <p>{selectedRequest.totalDays} día{selectedRequest.totalDays !== 1 ? 's' : ''}</p>
                  </div>
                  
                  {selectedRequest.isHalfDay && (
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <p>Media jornada</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Estado y Aprobación</h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Solicitado el:</span>
                    <p>{new Date(selectedRequest.createdAt).toLocaleDateString('es-ES')}</p>
                  </div>
                  
                  {selectedRequest.approvedAt && (
                    <div>
                      <span className="font-medium text-gray-700">
                        {selectedRequest.status === 'approved' ? 'Aprobado' : 'Rechazado'} el:
                      </span>
                      <p>{new Date(selectedRequest.approvedAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  )}
                  
                  {selectedRequest.approvedBy && (
                    <div>
                      <span className="font-medium text-gray-700">Por:</span>
                      <p>
                        {users?.find(u => u.id === selectedRequest.approvedBy)?.firstName} {users?.find(u => u.id === selectedRequest.approvedBy)?.lastName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedRequest.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Motivo del rechazo:</h4>
                <p className="text-red-700">{selectedRequest.rejectionReason}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              {userRole !== 'employee' && selectedRequest.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      handleApproveRequest(selectedRequest);
                      setShowViewModal(false);
                    }}
                    variant="success"
                    icon={Check}
                  >
                    Aprobar
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const reason = prompt('Motivo del rechazo (opcional):');
                      handleRejectRequest(selectedRequest, reason || undefined);
                      setShowViewModal(false);
                    }}
                    variant="danger"
                    icon={X}
                  >
                    Rechazar
                  </Button>
                </>
              )}
              
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}