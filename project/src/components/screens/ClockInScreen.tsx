import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Smartphone,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { useClockIns, useStations } from '../../hooks/useData';
import { qrEngine } from '../../services/qrEngine';
import { storageManager } from '../../services/storageManager';

export function ClockInScreen() {
  const { state, showNotification } = useApp();
  const { create: createClockIn, data: clockIns } = useClockIns();
  const { data: stations } = useStations();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentUser = state.session?.user;
  const userStations = stations?.filter(s => 
    s.isActive && s.allowedUserIds.includes(currentUser?.id || '')
  ) || [];

  // Obtener último fichaje del usuario
  const lastClockIn = clockIns
    ?.filter(c => c.userId === currentUser?.id)
    ?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const suggestedAction = lastClockIn?.type === 'in' ? 'out' : 'in';

  // ==========================================
  // GEOLOCALIZACIÓN
  // ==========================================

  useEffect(() => {
    if (navigator.geolocation && state.appMode.features.enableGeolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.warn('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [state.appMode.features.enableGeolocation]);

  // ==========================================
  // ESCÁNER QR
  // ==========================================

  const startScanning = async () => {
    try {
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Simular detección de QR cada 500ms
        const scanInterval = setInterval(() => {
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              
              // En una implementación real, aquí usarías una librería como jsQR
              // Por ahora simulamos la detección
              if (Math.random() < 0.1) { // 10% chance cada scan
                clearInterval(scanInterval);
                simulateQRDetection();
              }
            }
          }
        }, 500);
        
        // Auto-stop después de 30 segundos
        setTimeout(() => {
          clearInterval(scanInterval);
          if (isScanning) {
            stopScanning();
            showNotification({
              type: 'warning',
              title: 'Tiempo agotado',
              message: 'No se detectó ningún código QR. Inténtalo de nuevo.'
            });
          }
        }, 30000);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsScanning(false);
      showNotification({
        type: 'error',
        title: 'Error de cámara',
        message: 'No se pudo acceder a la cámara. Verifica los permisos.'
      });
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const simulateQRDetection = async () => {
    // Simular QR válido de una estación permitida
    if (userStations.length > 0) {
      const station = userStations[0];
      const mockQRData = station.qrCode;
      
      try {
        const validation = await qrEngine.validateQR(mockQRData, currentUser?.companyId);
        
        if (validation.isValid && validation.station) {
          setScanResult({
            success: true,
            station: validation.station,
            metadata: validation.metadata
          });
        } else {
          setScanResult({
            success: false,
            error: validation.error || 'QR inválido'
          });
        }
      } catch (error) {
        setScanResult({
          success: false,
          error: 'Error validando QR'
        });
      }
      
      stopScanning();
      setShowResult(true);
    }
  };

  // ==========================================
  // FICHAJE MANUAL
  // ==========================================

  const handleManualClockIn = async (stationId: string, type: 'in' | 'out') => {
    if (!currentUser) return;

    const station = stations?.find(s => s.id === stationId);
    if (!station) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Estación no encontrada'
      });
      return;
    }

    const clockInData = {
      userId: currentUser.id,
      stationId: station.id,
      type,
      timestamp: new Date().toISOString(),
      location: location ? {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy
      } : undefined,
      method: 'manual' as const,
      deviceInfo: {
        userAgent: navigator.userAgent,
        ip: '192.168.1.100',
        fingerprint: 'manual_' + currentUser.id
      },
      isManualEntry: true,
      notes: `Fichaje manual desde ${station.name}`
    };

    const result = await createClockIn(clockInData);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Fichaje registrado',
        message: `${type === 'in' ? 'Entrada' : 'Salida'} registrada en ${station.name}`,
        autoClose: true
      });
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo registrar el fichaje'
      });
    }
  };

  // ==========================================
  // PROCESAMIENTO DE RESULTADO QR
  // ==========================================

  const processQRResult = async (type: 'in' | 'out') => {
    if (!scanResult?.success || !scanResult.station || !currentUser) return;

    const clockInData = {
      userId: currentUser.id,
      stationId: scanResult.station.id,
      type,
      timestamp: new Date().toISOString(),
      location: location ? {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy
      } : undefined,
      method: 'qr' as const,
      deviceInfo: {
        userAgent: navigator.userAgent,
        ip: '192.168.1.100',
        fingerprint: 'qr_' + currentUser.id
      },
      isManualEntry: false,
      notes: `Fichaje QR desde ${scanResult.station.name}`
    };

    const result = await createClockIn(clockInData);
    
    if (result) {
      showNotification({
        type: 'success',
        title: 'Fichaje registrado',
        message: `${type === 'in' ? 'Entrada' : 'Salida'} registrada correctamente`,
        autoClose: true
      });
      
      setShowResult(false);
      setScanResult(null);
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo registrar el fichaje'
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Fichaje</h1>
          <p className="text-gray-600">
            Registra tu entrada y salida usando códigos QR o fichaje manual
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Estado de conexión */}
          <div className="flex items-center space-x-2">
            {state.isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-gray-600">
              {state.isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
          
          {/* Ubicación */}
          {location && (
            <div className="flex items-center space-x-2 text-green-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Ubicación detectada</span>
            </div>
          )}
        </div>
      </div>

      {/* Estado actual */}
      {lastClockIn && (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${
                lastClockIn.type === 'in' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div>
                <p className="font-medium text-gray-900">
                  Último fichaje: {lastClockIn.type === 'in' ? 'Entrada' : 'Salida'}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(lastClockIn.timestamp).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
            
            <Badge variant={lastClockIn.type === 'in' ? 'success' : 'danger'}>
              {lastClockIn.type === 'in' ? 'Trabajando' : 'Fuera'}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fichaje por QR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Fichaje por QR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Escanea el código QR de tu estación de trabajo para registrar tu fichaje automáticamente.
            </p>
            
            {!isScanning ? (
              <Button
                onClick={startScanning}
                icon={Camera}
                size="lg"
                fullWidth
                className="bg-blue-600 hover:bg-blue-700"
              >
                Iniciar Escáner QR
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Overlay de escaneado */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={stopScanning}
                  variant="secondary"
                  fullWidth
                >
                  Cancelar Escáner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fichaje Manual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Fichaje Manual</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Registra tu fichaje manualmente seleccionando una estación disponible.
            </p>
            
            {userStations.length > 0 ? (
              <div className="space-y-3">
                {userStations.map((station) => (
                  <div key={station.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{station.name}</h4>
                        <p className="text-sm text-gray-600">{station.location.address}</p>
                      </div>
                      <Badge variant="success" size="sm">Disponible</Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleManualClockIn(station.id, 'in')}
                        variant="success"
                        size="sm"
                        icon={CheckCircle}
                        className="flex-1"
                      >
                        Entrada
                      </Button>
                      <Button
                        onClick={() => handleManualClockIn(station.id, 'out')}
                        variant="danger"
                        size="sm"
                        icon={XCircle}
                        className="flex-1"
                      >
                        Salida
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tienes estaciones asignadas</p>
                <p className="text-sm text-gray-500">Contacta con tu administrador</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial reciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Fichajes Recientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clockIns
              ?.filter(c => c.userId === currentUser?.id)
              ?.slice(0, 5)
              ?.map((clockIn) => {
                const station = stations?.find(s => s.id === clockIn.stationId);
                return (
                  <div key={clockIn.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        clockIn.type === 'in' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {clockIn.type === 'in' ? 'Entrada' : 'Salida'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {station?.name} • {new Date(clockIn.timestamp).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={clockIn.method === 'qr' ? 'info' : 'warning'} size="sm">
                        {clockIn.method === 'qr' ? 'QR' : 'Manual'}
                      </Badge>
                      {clockIn.syncStatus === 'pending' && (
                        <Badge variant="warning" size="sm">Pendiente</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {(!clockIns || clockIns.filter(c => c.userId === currentUser?.id).length === 0) && (
              <p className="text-center text-gray-500 py-4">
                No hay fichajes registrados
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de resultado QR */}
      <Modal
        isOpen={showResult}
        onClose={() => {
          setShowResult(false);
          setScanResult(null);
        }}
        title="Resultado del Escáner"
      >
        {scanResult?.success ? (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                QR Válido Detectado
              </h3>
              <p className="text-gray-600">
                Estación: <strong>{scanResult.station?.name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                {scanResult.station?.location.address}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => processQRResult('in')}
                variant="success"
                icon={CheckCircle}
                fullWidth
              >
                Registrar Entrada
              </Button>
              <Button
                onClick={() => processQRResult('out')}
                variant="danger"
                icon={XCircle}
                fullWidth
              >
                Registrar Salida
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">
              Error en el QR
            </h3>
            <p className="text-gray-600">
              {scanResult?.error || 'No se pudo procesar el código QR'}
            </p>
            <Button
              onClick={() => {
                setShowResult(false);
                setScanResult(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}