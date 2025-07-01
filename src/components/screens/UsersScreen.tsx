import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import { formatDate } from '../../services/dateUtils';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { useUsers, useStations } from '../../hooks/useData';
import type { User } from '../../types';

export function UsersScreen() {
  const { state, showNotification } = useApp();
  const { 
    data: users, 
    loading, 
    create: createUser, 
    update: updateUser, 
    remove: removeUser,
    filter,
    setFilter,
    pagination,
    nextPage,
    prevPage
  } = useUsers();
  
  const { data: stations } = useStations();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});

  const userRole = state.session?.user.role || 'employee';
  const currentCompany = state.currentCompany;

  // Solo admin y manager pueden ver esta pantalla
  if (userRole === 'employee') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">No tienes permisos para ver la gestión de empleados</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // HANDLERS DE FORMULARIO
  // ==========================================

  const handleCreateUser = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Completa todos los campos obligatorios'
      });
      return;
    }

    const newUser = {
      ...formData,
      role: formData.role || 'employee',
      isActive: true,
      stationIds: formData.stationIds || [],
      timezone: currentCompany?.timezone || 'Europe/Madrid',
      locale: currentCompany?.locale || 'es-ES',
      currency: currentCompany?.currency || 'EUR',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      passwordHash: bcrypt.hashSync('hello', 10),
      permissions: getDefaultPermissions(formData.role || 'employee')
    };

    const result = await createUser(newUser);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Usuario creado',
        message: `${formData.firstName} ${formData.lastName} ha sido añadido al sistema`,
        autoClose: true
      });
      setShowCreateModal(false);
      setFormData({});
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo crear el usuario'
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const result = await updateUser(selectedUser.id, formData);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Usuario actualizado',
        message: 'Los cambios han sido guardados correctamente',
        autoClose: true
      });
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({});
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el usuario'
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === state.session?.user.id) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No puedes eliminar tu propio usuario'
      });
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar a ${user.firstName} ${user.lastName}?`
    );
    
    if (confirmed) {
      const result = await removeUser(user.id);
      
      if (result) {
        showNotification({
          type: 'success',
          title: 'Usuario eliminado',
          message: 'El usuario ha sido eliminado del sistema',
          autoClose: true
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudo eliminar el usuario'
        });
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    const result = await updateUser(user.id, { isActive: !user.isActive });
    
    if (result) {
      showNotification({
        type: 'success',
        title: user.isActive ? 'Usuario desactivado' : 'Usuario activado',
        message: `${user.firstName} ${user.lastName} ha sido ${user.isActive ? 'desactivado' : 'activado'}`,
        autoClose: true
      });
    }
  };

  // ==========================================
  // UTILIDADES
  // ==========================================

  const getDefaultPermissions = (role: string) => {
    switch (role) {
      case 'admin':
        return [{ resource: '*', actions: ['create', 'read', 'update', 'delete', 'approve'] }];
      case 'manager':
        return [
          { resource: 'users', actions: ['read', 'update'] },
          { resource: 'clockins', actions: ['read', 'update', 'approve'] },
          { resource: 'leaves', actions: ['read', 'approve'] },
          { resource: 'stations', actions: ['read'] },
          { resource: 'reports', actions: ['read'] }
        ];
      default:
        return [
          { resource: 'clockins', actions: ['create', 'read'] },
          { resource: 'leaves', actions: ['create', 'read', 'update'] },
          { resource: 'profile', actions: ['read', 'update'] }
        ];
    }
  };

  const getUserStations = (user: User) => {
    return stations?.filter(s => user.stationIds.includes(s.id)) || [];
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      phoneNumber: user.phoneNumber,
      salary: user.salary,
      stationIds: user.stationIds
    });
    setShowEditModal(true);
  };

  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600">
            Administra los usuarios y sus permisos en el sistema
          </p>
        </div>
        
        {userRole === 'admin' && (
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Nuevo Empleado
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar empleados..."
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
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            
            <select
              value={filter.type?.[0] || ''}
              onChange={(e) => setFilter({ 
                ...filter, 
                type: e.target.value ? [e.target.value] : [] 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="manager">Manager</option>
              <option value="employee">Empleado</option>
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

      {/* Lista de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map((user) => {
          const userStations = getUserStations(user);
          
          return (
            <Card key={user.id} hover>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{user.position || user.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Badge 
                      variant={user.isActive ? 'success' : 'danger'} 
                      size="sm"
                    >
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    
                    <Badge 
                      variant={
                        user.role === 'admin' ? 'danger' :
                        user.role === 'manager' ? 'warning' : 'info'
                      } 
                      size="sm"
                    >
                      {user.role === 'admin' ? 'Admin' :
                       user.role === 'manager' ? 'Manager' : 'Empleado'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  
                  {user.phoneNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{user.phoneNumber}</span>
                    </div>
                  )}
                  
                  {user.department && (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{user.department}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{userStations.length} estación{userStations.length !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-2 border-t">
                  <Button
                    onClick={() => openViewModal(user)}
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    className="flex-1"
                  >
                    Ver
                  </Button>
                  
                  {userRole === 'admin' && (
                    <>
                      <Button
                        onClick={() => openEditModal(user)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        className="flex-1"
                      >
                        Editar
                      </Button>
                      
                      <Button
                        onClick={() => handleToggleActive(user)}
                        variant="ghost"
                        size="sm"
                        icon={user.isActive ? UserX : UserCheck}
                        className="flex-1"
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paginación */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} empleados
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

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
        }}
        title="Nuevo Empleado"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Nombre del empleado"
            />
            
            <Input
              label="Apellidos *"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Apellidos del empleado"
            />
          </div>
          
          <Input
            label="Email *"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@empresa.com"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                value={formData.role || 'employee'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Empleado</option>
                <option value="manager">Manager</option>
                {userRole === 'admin' && <option value="admin">Administrador</option>}
              </select>
            </div>
            
            <Input
              label="Teléfono"
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+34 600 123 456"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Departamento"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Ventas, IT, RRHH..."
            />
            
            <Input
              label="Posición"
              value={formData.position || ''}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Desarrollador, Comercial..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            
            <Input
              label="Salario anual"
              type="number"
              value={formData.salary || ''}
              onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
              placeholder="30000"
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
            <Button onClick={handleCreateUser}>
              Crear Empleado
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          setFormData({});
        }}
        title="Editar Empleado"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            
            <Input
              label="Apellidos"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role || 'employee'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Empleado</option>
                <option value="manager">Manager</option>
                {userRole === 'admin' && <option value="admin">Administrador</option>}
              </select>
            </div>
            
            <Input
              label="Teléfono"
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Departamento"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            
            <Input
              label="Posición"
              value={formData.position || ''}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          
          <Input
            label="Salario anual"
            type="number"
            value={formData.salary || ''}
            onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
                setFormData({});
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Usuario */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedUser(null);
        }}
        title="Detalles del Empleado"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-xl">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </span>
                </div>
              )}
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-gray-600">{selectedUser.position || selectedUser.role}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={selectedUser.isActive ? 'success' : 'danger'}>
                    {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Badge variant={
                    selectedUser.role === 'admin' ? 'danger' :
                    selectedUser.role === 'manager' ? 'warning' : 'info'
                  }>
                    {selectedUser.role === 'admin' ? 'Administrador' :
                     selectedUser.role === 'manager' ? 'Manager' : 'Empleado'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Información Personal</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedUser.email}</span>
                  </div>
                  
                  {selectedUser.phoneNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedUser.phoneNumber}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Inicio: {formatDate(new Date(selectedUser.startDate), state.session?.user.locale || 'es-ES')}
                    </span>
                  </div>
                  
                  {selectedUser.salary && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {selectedUser.salary.toLocaleString('es-ES')} {selectedUser.currency || 'EUR'}/año
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Información Laboral</h4>
                
                <div className="space-y-3">
                  {selectedUser.department && (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedUser.department}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {getUserStations(selectedUser).length} estación{getUserStations(selectedUser).length !== 1 ? 'es' : ''} asignada{getUserStations(selectedUser).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {getUserStations(selectedUser).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Estaciones:</p>
                      <div className="space-y-1">
                        {getUserStations(selectedUser).map(station => (
                          <div key={station.id} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            {station.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              {userRole === 'admin' && (
                <>
                  <Button
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedUser);
                    }}
                    variant="secondary"
                    icon={Edit}
                  >
                    Editar
                  </Button>
                  
                  <Button
                    onClick={() => handleDeleteUser(selectedUser)}
                    variant="danger"
                    icon={Trash2}
                  >
                    Eliminar
                  </Button>
                </>
              )}
              
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
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