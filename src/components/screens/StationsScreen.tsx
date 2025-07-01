import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  QrCode, 
  Edit, 
  Trash2, 
  Eye, 
  Power, 
  PowerOff,
  Download,
  RefreshCw,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { useStations, useUsers } from '../../hooks/useData';
import { qrEngine } from '../../services/qrEngine';
import type { Station } from '../../types';

export function StationsScreen() {
  const { state, showNotification } = useApp();
  const { 
    data: stations, 
    loading, 
    create: createStation, 
    update: updateStation, 
    remove: removeStation,
    filter,
    setFilter
  } = useStations();
  
  const { data: users } = useUsers();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState<Partial<Station>>({});
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const userRole = state.session?.user.role || 'employee';
  const currentCompany = state.currentCompany;

  // Solo admin y manager pueden ver esta pantalla
  if (userRole === 'employee') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">No tienes permisos para ver la gestión de estaciones</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // HANDLERS DE FORMULARIO
  // ==========================================

  const handleCreateStation = async () => {
    if (!formData.name || !formData.location?.address) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Completa todos los campos obligatorios'
      });
      return;
    }

    try {
      setIsGeneratingQR(true);
      
      // Generar ID temporal para la estación
      const tempId = `station_${Date.now()}`;
      
      // Generar QR para la nueva estación
      const qrCode = await qrEngine.generateStationQR(tempId, currentCompany?.id || '');
      
      const newStation = {
        ...formData,
        name: formData.name!,
        location: formData.location!,
        qrCode,
        qrMetadata: {
          stationId: tempId,
          companyId: currentCompany?.id || '',
          timestamp: new Date().toISOString(),
          version: '1.0',
          isTemporary: false
        },
        isActive: true,
        allowedUserIds: formData.allowedUserIds || [],
        stationType: formData.stationType || 'office',
        restrictions: formData.restrictions || { timeWindows: [] }
      };

      const result = await createStation(newStation);
      
      if (result) {
        showNotification({
          type: 'success',
          title: 'Estación creada',
          message: `${formData.name} ha sido añadida al sistema`,
          autoClose: true
        });
        setShowCreateModal(false);
        setFormData({});
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudo crear la estación'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error generando el código QR'
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleUpdateStation = async () => {
    if (!selectedStation) return;

    const result = await updateStation(selectedStation.id, formData);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Estación actualizada',
        message: 'Los cambios han sido guardados correctamente',
        autoClose: true
      });
      setShowEditModal(false);
      setSelectedStation(null);
      setFormData({});
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar la estación'
      });
    }
  };

  const handleDeleteStation = async (station: Station) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar la estación "${station.name}"?`
    );
    
    if (confirmed) {
      const result = await removeStation(station.id);
      
      if (result) {
        showNotification({
          type: 'success',
          title: 'Estación eliminada',
          message: 'La estación ha sido eliminada del sistema',
          autoClose: true
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudo eliminar la estación'
        });
      }
    }
  };

  const handleToggleActive = async (station: Station) => {
    const result = await updateStation(station.id, { isActive: !station.isActive });
    
    if (result) {
      showNotification({
        type: 'success',
        title: station.isActive ? 'Estación desactivada' : 'Estación activada',
        message: `${station.name} ha sido ${station.isActive ? 'desactivada' : 'activada'}`,
        autoClose: true
      });
    }
  };

  const handleRegenerateQR = async (station: Station) => {
    try {
      setIsGeneratingQR(true);
      
      const newQR = await qrEngine.generateStationQR(station.id, currentCompany?.id || '');
      
      const result = await updateStation(station.id, {
        qrCode: newQR,
        qrMetadata: {
          stationId: station.id,
          companyId: currentCompany?.id || '',
          timestamp: new Date().toISOString(),
          version: '1.0',
          isTemporary: false
        }
      });
      
      if (result) {
        showNotification({
          type: 'success',
          title: 'QR regenerado',
          message: 'El código QR ha sido actualizado correctamente',
          autoClose: true
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo regenerar el código QR'
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const downloadQR = (station: Station) => {
    // En una implementación real, esto generaría una imagen QR descargable
    const qrData = qrEngine.generateQRDisplayData(station.qrCode);
    
    const element = document.createElement('a');
    const file = new Blob([`Estación: ${station.name}\nCódigo: ${qrData.shortCode}\nQR Data: ${station.qrCode}`], {
      type: 'text/plain'
    });
    element.href = URL.createObjectURL(file);
    element.download = `qr-${station.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showNotification({
      type: 'success',
      title: 'QR descargado',
      message: 'El archivo con los datos del QR ha sido descargado',
      autoClose: true
    });
  };

  // ==========================================
  // UTILIDADES
  // ==========================================

  const getStationUsers = (station: Station) => {
    return users?.filter(u => station.allowedUserIds.includes(u.id)) || [];
  };

  const openEditModal = (station: Station) => {
    setSelectedStation(station);
    setFormData({
      name: station.name,
      location: station.location,
      description: station.description,
      stationType: station.stationType,
      allowedUserIds: station.allowedUserIds,
      restrictions: station.restrictions
    });
    setShowEditModal(true);
  };

  const openQRModal = (station: Station) => {
    setSelectedStation(station);
    setShowQRModal(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Estaciones</h1>
          <p className="text-gray-600">
            Administra las estaciones de fichaje y sus códigos QR
          </p>
        </div>
        
        {userRole === 'admin' && (
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Nueva Estación
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar estaciones..."
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
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
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
              <option value="entrance">Entrada</option>
              <option value="office">Oficina</option>
              <option value="warehouse">Almacén</option>
              <option value="mobile">Móvil</option>
              <option value="kiosk">Kiosco</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de estaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations?.map((station) => {
          const stationUsers = getStationUsers(station);
          const qrData = qrEngine.generateQRDisplayData(station.qrCode);
          
          return (
            <Card key={station.id} hover>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{station.name}</h3>
                    <p className="text-sm text-gray-600">{station.location.address}</p>
                    {station.description && (
                      <p className="text-xs text-gray-500 mt-1">{station.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    <Badge 
                      variant={station.isActive ? 'success' : 'danger'} 
                      size="sm"
                    >
                      {station.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                    
                    <Badge 
                      variant="info" 
                      size="sm"
                    >
                      {station.stationType === 'entrance' ? 'Entrada' :
                       station.stationType === 'office' ? 'Oficina' :
                       station.stationType === 'warehouse' ? 'Almacén' :
                       station.stationType === 'mobile' ? 'Móvil' : 'Kiosco'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{stationUsers.length} usuario{stationUsers.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-600">
                      <QrCode className="w-4 h-4" />
                      <span className="font-mono text-xs">{qrData.shortCode}</span>
                    </div>
                  </div>
                  
                  {station.restrictions?.timeWindows && station.restrictions.timeWindows.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span>Horario restringido</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    onClick={() => openQRModal(station)}
                    variant="ghost"
                    size="sm"
                    icon={QrCode}
                  >
                    Ver QR
                  </Button>
                  
                  <Button
                    onClick={() => downloadQR(station)}
                    variant="ghost"
                    size="sm"
                    icon={Download}
                  >
                    Descargar
                  </Button>
                  
                  {userRole === 'admin' && (
                    <>
                      <Button
                        onClick={() => openEditModal(station)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                      >
                        Editar
                      </Button>
                      
                      <Button
                        onClick={() => handleToggleActive(station)}
                        variant="ghost"
                        size="sm"
                        icon={station.isActive ? PowerOff : Power}
                      >
                        {station.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {(!stations || stations.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay estaciones</h2>
            <p className="text-gray-600 mb-4">
              Crea tu primera estación de fichaje para empezar
            </p>
            {userRole === 'admin' && (
              <Button
                onClick={() => setShowCreateModal(true)}
                icon={Plus}
              >
                Crear Primera Estación
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Crear Estación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
        }}
        title="Nueva Estación"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la estación *"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Entrada Principal, Oficina 1..."
          />
          
          <Input
            label="Dirección *"
            value={formData.location?.address || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              location: { ...formData.location, address: e.target.value } 
            })}
            placeholder="Calle Principal 123, Madrid"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Latitud"
              type="number"
              step="any"
              value={formData.location?.lat || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                location: { ...formData.location, lat: Number(e.target.value) } 
              })}
              placeholder="40.4168"
            />
            
            <Input
              label="Longitud"
              type="number"
              step="any"
              value={formData.location?.lng || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                location: { ...formData.location, lng: Number(e.target.value) } 
              })}
              placeholder="-3.7038"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de estación
            </label>
            <select
              value={formData.stationType || 'office'}
              onChange={(e) => setFormData({ ...formData, stationType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="entrance">Entrada</option>
              <option value="office">Oficina</option>
              <option value="warehouse">Almacén</option>
              <option value="mobile">Móvil</option>
              <option value="kiosk">Kiosco</option>
            </select>
          </div>
          
          <Input
            label="Descripción"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción opcional de la estación"
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setFormData({});
              }}
              variant="secondary"
              disabled={isGeneratingQR}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateStation}
              loading={isGeneratingQR}
            >
              {isGeneratingQR ? 'Generando QR...' : 'Crear Estación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Estación */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStation(null);
          setFormData({});
        }}
        title="Editar Estación"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la estación"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          
          <Input
            label="Dirección"
            value={formData.location?.address || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              location: { ...formData.location, address: e.target.value } 
            })}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Latitud"
              type="number"
              step="any"
              value={formData.location?.lat || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                location: { ...formData.location, lat: Number(e.target.value) } 
              })}
            />
            
            <Input
              label="Longitud"
              type="number"
              step="any"
              value={formData.location?.lng || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                location: { ...formData.location, lng: Number(e.target.value) } 
              })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de estación
            </label>
            <select
              value={formData.stationType || 'office'}
              onChange={(e) => setFormData({ ...formData, stationType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="entrance">Entrada</option>
              <option value="office">Oficina</option>
              <option value="warehouse">Almacén</option>
              <option value="mobile">Móvil</option>
              <option value="kiosk">Kiosco</option>
            </select>
          </div>
          
          <Input
            label="Descripción"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setShowEditModal(false);
                setSelectedStation(null);
                setFormData({});
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateStation}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver QR */}
      <Modal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setSelectedStation(null);
        }}
        title="Código QR de la Estación"
        size="md"
      >
        {selectedStation && (
          <div className="space-y-6 text-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedStation.name}
              </h3>
              <p className="text-gray-600">{selectedStation.location.address}</p>
            </div>
            
            {/* Aquí iría el QR visual - por ahora mostramos el código */}
            <div className="bg-gray-100 rounded-lg p-8">
              <div className="w-48 h-48 bg-white rounded-lg mx-auto flex items-center justify-center border-2 border-gray-300">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Código QR</p>
                  <p className="text-sm font-mono text-gray-700 mt-2">
                    {qrEngine.generateQRDisplayData(selectedStation.qrCode).shortCode}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>Escanea este código con la app móvil para fichar</p>
              <p className="font-mono text-xs bg-gray-50 p-2 rounded">
                ID: {selectedStation.id}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => downloadQR(selectedStation)}
                variant="secondary"
                icon={Download}
                fullWidth
              >
                Descargar
              </Button>
              
              {userRole === 'admin' && (
                <Button
                  onClick={() => handleRegenerateQR(selectedStation)}
                  variant="secondary"
                  icon={RefreshCw}
                  loading={isGeneratingQR}
                  fullWidth
                >
                  Regenerar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}