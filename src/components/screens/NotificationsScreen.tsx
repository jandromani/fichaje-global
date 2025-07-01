import React, { useState } from 'react';
import { formatDate } from '../../services/dateUtils';
import { 
  Bell, 
  Check, 
  X, 
  Eye, 
  Trash2, 
  Filter,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { storageManager } from '../../services/storageManager';
import type { Notification } from '../../types';

export function NotificationsScreen() {
  const { state, showNotification, clearAllNotifications } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    return storageManager.get('wmapp_notifications', [])
      .filter((n: Notification) => n.userId === state.session?.user.id);
  });
  
  const [filter, setFilter] = useState({
    search: '',
    type: '',
    isRead: '',
    priority: ''
  });
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ==========================================
  // FILTRADO DE NOTIFICACIONES
  // ==========================================

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = !filter.search || 
      notification.title.toLowerCase().includes(filter.search.toLowerCase()) ||
      notification.message.toLowerCase().includes(filter.search.toLowerCase());

    const matchesType = !filter.type || notification.type === filter.type;
    
    const matchesRead = !filter.isRead || 
      (filter.isRead === 'read' ? notification.isRead : !notification.isRead);
    
    const matchesPriority = !filter.priority || notification.priority === filter.priority;

    return matchesSearch && matchesType && matchesRead && matchesPriority;
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotifications(updatedNotifications);
    
    // Actualizar en localStorage
    const allNotifications = storageManager.get('wmapp_notifications', []);
    const updatedAll = allNotifications.map((n: Notification) => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    storageManager.set('wmapp_notifications', updatedAll);
  };

  const markAsUnread = (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: false } : n
    );
    setNotifications(updatedNotifications);
    
    // Actualizar en localStorage
    const allNotifications = storageManager.get('wmapp_notifications', []);
    const updatedAll = allNotifications.map((n: Notification) => 
      n.id === notificationId ? { ...n, isRead: false } : n
    );
    storageManager.set('wmapp_notifications', updatedAll);
  };

  const deleteNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    
    // Actualizar en localStorage
    const allNotifications = storageManager.get('wmapp_notifications', []);
    const updatedAll = allNotifications.filter((n: Notification) => n.id !== notificationId);
    storageManager.set('wmapp_notifications', updatedAll);
    
    showNotification({
      type: 'success',
      title: 'Notificación eliminada',
      message: 'La notificación ha sido eliminada correctamente',
      autoClose: true
    });
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updatedNotifications);
    
    // Actualizar en localStorage
    const allNotifications = storageManager.get('wmapp_notifications', []);
    const updatedAll = allNotifications.map((n: Notification) => 
      n.userId === state.session?.user.id ? { ...n, isRead: true } : n
    );
    storageManager.set('wmapp_notifications', updatedAll);
    
    showNotification({
      type: 'success',
      title: 'Notificaciones marcadas',
      message: 'Todas las notificaciones han sido marcadas como leídas',
      autoClose: true
    });
  };

  const clearAllUserNotifications = () => {
    const confirmed = window.confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?');
    
    if (confirmed) {
      setNotifications([]);
      
      // Actualizar en localStorage
      const allNotifications = storageManager.get('wmapp_notifications', []);
      const updatedAll = allNotifications.filter((n: Notification) => n.userId !== state.session?.user.id);
      storageManager.set('wmapp_notifications', updatedAll);
      
      showNotification({
        type: 'success',
        title: 'Notificaciones eliminadas',
        message: 'Todas las notificaciones han sido eliminadas',
        autoClose: true
      });
    }
  };

  const openDetailModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  // ==========================================
  // UTILIDADES
  // ==========================================

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'clockin':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'leave':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'system':
        return <Info className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-amber-500 bg-amber-50';
      case 'clockin': return 'border-blue-500 bg-blue-50';
      case 'leave': return 'border-purple-500 bg-purple-50';
      case 'system': return 'border-gray-500 bg-gray-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      info: 'Información',
      warning: 'Advertencia',
      error: 'Error',
      success: 'Éxito',
      clockin: 'Fichaje',
      leave: 'Ausencia',
      system: 'Sistema'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600">
            Gestiona tus notificaciones y alertas del sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Badge variant="danger" size="sm">
              {unreadCount} sin leer
            </Badge>
          )}
          
          <Button
            onClick={markAllAsRead}
            variant="secondary"
            size="sm"
            icon={Check}
            disabled={unreadCount === 0}
          >
            Marcar todas como leídas
          </Button>
          
          <Button
            onClick={clearAllUserNotifications}
            variant="danger"
            size="sm"
            icon={Trash2}
            disabled={notifications.length === 0}
          >
            Eliminar todas
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{notifications.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-amber-100 rounded-lg p-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Sin leer</p>
              <p className="text-xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-3">
            <div className="bg-red-100 rounded-lg p-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Críticas</p>
              <p className="text-xl font-bold text-gray-900">
                {notifications.filter(n => n.priority === 'critical').length}
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
              <p className="text-sm font-medium text-gray-600">Requieren acción</p>
              <p className="text-xl font-bold text-gray-900">
                {notifications.filter(n => n.actionRequired).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar notificaciones..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              icon={Bell}
            />
            
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="info">Información</option>
              <option value="warning">Advertencia</option>
              <option value="error">Error</option>
              <option value="success">Éxito</option>
              <option value="clockin">Fichaje</option>
              <option value="leave">Ausencia</option>
              <option value="system">Sistema</option>
            </select>
            
            <select
              value={filter.isRead}
              onChange={(e) => setFilter({ ...filter, isRead: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="unread">Sin leer</option>
              <option value="read">Leídas</option>
            </select>
            
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            
            <Button
              onClick={() => setFilter({ search: '', type: '', isRead: '', priority: '' })}
              variant="secondary"
              icon={Filter}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de notificaciones */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            hover
            className={`transition-all duration-200 ${
              !notification.isRead ? 'ring-2 ring-blue-100' : ''
            }`}
          >
            <CardContent>
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        
                        <Badge variant={getPriorityColor(notification.priority)} size="sm">
                          {notification.priority === 'critical' ? 'Crítica' :
                           notification.priority === 'high' ? 'Alta' :
                           notification.priority === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        
                        <Badge variant="info" size="sm">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        
                        {notification.actionRequired && (
                          <Badge variant="warning" size="sm">Acción requerida</Badge>
                        )}
                      </div>
                      
                      <p className={`text-sm ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'} mb-2`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatDate(new Date(notification.createdAt), state.session?.user.locale || 'es-ES')}</span>
                        
                        {notification.expiresAt && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Expira: {formatDate(new Date(notification.expiresAt), state.session?.user.locale || 'es-ES')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => openDetailModal(notification)}
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                      >
                        Ver
                      </Button>
                      
                      {notification.isRead ? (
                        <Button
                          onClick={() => markAsUnread(notification.id)}
                          variant="ghost"
                          size="sm"
                          icon={X}
                        >
                          No leída
                        </Button>
                      ) : (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          icon={Check}
                        >
                          Marcar leída
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => deleteNotification(notification.id)}
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        className="text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {notifications.length === 0 ? 'No tienes notificaciones' : 'No hay notificaciones que coincidan'}
            </h2>
            <p className="text-gray-600">
              {notifications.length === 0 
                ? 'Las notificaciones aparecerán aquí cuando haya actividad en tu cuenta'
                : 'Intenta ajustar los filtros para ver más notificaciones'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedNotification(null);
        }}
        title="Detalle de Notificación"
        size="lg"
      >
        {selectedNotification && (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${getNotificationColor(selectedNotification.type)}`}>
                {getNotificationIcon(selectedNotification.type)}
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedNotification.title}
                </h3>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Badge variant={getPriorityColor(selectedNotification.priority)}>
                    Prioridad {selectedNotification.priority === 'critical' ? 'Crítica' :
                              selectedNotification.priority === 'high' ? 'Alta' :
                              selectedNotification.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                  
                  <Badge variant="info">
                    {getTypeLabel(selectedNotification.type)}
                  </Badge>
                  
                  {selectedNotification.actionRequired && (
                    <Badge variant="warning">Acción requerida</Badge>
                  )}
                </div>
                
                <p className="text-gray-700 mb-4">
                  {selectedNotification.message}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Información</h4>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Fecha:</span>
                    <p>{new Date(selectedNotification.createdAt).toLocaleString('es-ES')}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Estado:</span>
                    <p>{selectedNotification.isRead ? 'Leída' : 'Sin leer'}</p>
                  </div>
                  
                  {selectedNotification.expiresAt && (
                    <div>
                      <span className="font-medium text-gray-700">Expira:</span>
                      <p>{new Date(selectedNotification.expiresAt).toLocaleString('es-ES')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedNotification.relatedEntityType && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Relacionado</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <p className="capitalize">{selectedNotification.relatedEntityType}</p>
                    </div>
                    
                    {selectedNotification.relatedEntityId && (
                      <div>
                        <span className="font-medium text-gray-700">ID:</span>
                        <p className="font-mono text-xs">{selectedNotification.relatedEntityId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              {!selectedNotification.isRead && (
                <Button
                  onClick={() => {
                    markAsRead(selectedNotification.id);
                    setShowDetailModal(false);
                  }}
                  variant="secondary"
                  icon={Check}
                >
                  Marcar como leída
                </Button>
              )}
              
              <Button
                onClick={() => {
                  deleteNotification(selectedNotification.id);
                  setShowDetailModal(false);
                }}
                variant="danger"
                icon={Trash2}
              >
                Eliminar
              </Button>
              
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedNotification(null);
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