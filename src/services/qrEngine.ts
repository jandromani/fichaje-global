import type { QRMetadata, Station } from '../types';

// ==========================================
// MOTOR DE GENERACIÓN Y VALIDACIÓN DE QR
// ==========================================

interface QRGenerationOptions {
  stationId: string;
  companyId: string;
  isTemporary?: boolean;
  expiresIn?: number; // milliseconds
  templateId?: string;
  customData?: Record<string, any>;
  language?: string;
  mode?: 'demo' | 'production';
}

interface QRValidationResult {
  isValid: boolean;
  metadata?: QRMetadata;
  error?: string;
  station?: Station;
}

class QREngine {
  private readonly version = '1.0';
  private readonly compressionThreshold = 500;
  private cryptoAvailable = false;
  private secretKey: CryptoKey | null = null;

  constructor() {
    this.initializeCrypto();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  private async initializeCrypto(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        this.cryptoAvailable = true;
        const storedSecret = localStorage.getItem('wmapp_qr_secret');
        let secret: Uint8Array;
        if (storedSecret) {
          secret = Uint8Array.from(atob(storedSecret), c => c.charCodeAt(0));
        } else {
          secret = new Uint8Array(32);
          window.crypto.getRandomValues(secret);
          localStorage.setItem('wmapp_qr_secret', btoa(String.fromCharCode(...secret)));
        }
        this.secretKey = await window.crypto.subtle.importKey(
          'raw',
          secret,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign', 'verify']
        );
        console.log('[QREngine] Crypto API available - signatures enabled');
      } else {
        console.warn('[QREngine] Crypto API not available - signatures disabled');
      }
    } catch (error) {
      console.warn('[QREngine] Crypto initialization failed:', error);
    }
  }

  // ==========================================
  // GENERACIÓN DE QR
  // ==========================================

  async generateQR(options: QRGenerationOptions): Promise<string> {
    try {
      const now = new Date().toISOString();
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn).toISOString()
        : undefined;

      const metadata: QRMetadata = {
        stationId: options.stationId,
        companyId: options.companyId,
        timestamp: now,
        version: this.version,
        language: options.language || navigator.language || 'en',
        mode: options.mode || 'demo',
        isTemporary: options.isTemporary || false,
        templateId: options.templateId,
        expiresAt
      };

      // Crear payload base
      const payload = {
        ...metadata,
        ...options.customData
      };

      // Agregar firma si está disponible
      if (this.cryptoAvailable) {
        payload.signature = await this.generateSignature(payload);
      }

      // Serializar y comprimir si es necesario
      let qrData = JSON.stringify(payload);
      
      if (qrData.length > this.compressionThreshold) {
        qrData = this.compressData(qrData);
      }

      // Codificar en base64 para QR
      return btoa(qrData);

    } catch (error) {
      console.error('[QREngine] QR generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateStationQR(
    stationId: string,
    companyId: string,
    options?: { language?: string; mode?: 'demo' | 'production' }
  ): Promise<string> {
    return this.generateQR({
      stationId,
      companyId,
      isTemporary: false,
      language: options?.language,
      mode: options?.mode
    });
  }

  async generateTemporaryQR(
    stationId: string,
    companyId: string,
    expiresInHours: number = 24,
    options?: { language?: string; mode?: 'demo' | 'production' }
  ): Promise<string> {
    return this.generateQR({
      stationId,
      companyId,
      isTemporary: true,
      expiresIn: expiresInHours * 60 * 60 * 1000,
      templateId: `temp_${Date.now()}`,
      language: options?.language,
      mode: options?.mode
    });
  }

  // ==========================================
  // VALIDACIÓN DE QR
  // ==========================================

  async validateQR(qrData: string, expectedCompanyId?: string): Promise<QRValidationResult> {
    try {
      // Decodificar base64
      let decodedData: string;
      try {
        decodedData = atob(qrData);
      } catch {
        return { isValid: false, error: 'Invalid QR format' };
      }

      // Descomprimir si es necesario
      if (this.isCompressed(decodedData)) {
        decodedData = this.decompressData(decodedData);
      }

      // Parsear JSON
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(decodedData);
      } catch {
        return { isValid: false, error: 'Invalid QR data format' };
      }

      // Validar estructura básica
      if (!this.hasRequiredFields(payload)) {
        return { isValid: false, error: 'Missing required QR fields' };
      }

      const metadata: QRMetadata = {
        stationId: payload.stationId,
        companyId: payload.companyId,
        timestamp: payload.timestamp,
        version: payload.version,
        language: payload.language,
        mode: payload.mode,
        signature: payload.signature,
        expiresAt: payload.expiresAt,
        isTemporary: payload.isTemporary || false,
        templateId: payload.templateId
      };

      // Validar empresa si se especifica
      if (expectedCompanyId && metadata.companyId !== expectedCompanyId) {
        return { isValid: false, error: 'QR belongs to different company' };
      }

      // Validar expiración
      if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
        return { isValid: false, error: 'QR code has expired' };
      }

      // Validar versión
      if (!this.isVersionCompatible(metadata.version)) {
        return { isValid: false, error: 'QR version not supported' };
      }

      // Validar firma si está presente
      if (metadata.signature && this.cryptoAvailable) {
        const isSignatureValid = await this.validateSignature(payload);
        if (!isSignatureValid) {
          return { isValid: false, error: 'Invalid QR signature' };
        }
      }

      // Verificar que la estación existe y está activa
      const station = await this.validateStation(metadata.stationId, metadata.companyId);
      if (!station) {
        return { isValid: false, error: 'Station not found or inactive' };
      }

      return {
        isValid: true,
        metadata,
        station
      };

    } catch (error) {
      console.error('[QREngine] QR validation failed:', error);
      return { isValid: false, error: 'QR validation error' };
    }
  }

  // ==========================================
  // UTILIDADES DE QR
  // ==========================================

  generateQRDisplayData(qrCode: string): {
    displayText: string;
    shortCode: string;
    qrUrl: string;
  } {
    const shortCode = qrCode.slice(-8).toUpperCase();
    const displayText = `Station Access Code: ${shortCode}`;
    const qrUrl = `data:text/plain;base64,${qrCode}`;

    return {
      displayText,
      shortCode,
      qrUrl
    };
  }

  async refreshStationQRs(companyId: string): Promise<{ stationId: string; qrCode: string }[]> {
    try {
      // En una implementación real, esto cargaría las estaciones desde la base de datos
      const stations = (JSON.parse(localStorage.getItem('wmapp_stations') || '[]') as Record<string, unknown>[])
        .filter(s =>
          (s.companyId as string) === companyId && Boolean((s as { isActive?: boolean }).isActive)
        );

      const refreshedQRs: { stationId: string; qrCode: string }[] = [];

      for (const station of stations) {
        const appMode = JSON.parse(localStorage.getItem('wmapp_mode') || '{"mode":"demo"}');
        const newQR = await this.generateStationQR(station.id, companyId, { language: navigator.language || 'en', mode: appMode.mode });
        
        // Actualizar el QR en la estación
        station.qrCode = newQR;
        station.qrMetadata = {
          stationId: station.id,
          companyId,
          timestamp: new Date().toISOString(),
          version: this.version,
          language: navigator.language || 'en',
          mode: appMode.mode,
          isTemporary: false
        };

        refreshedQRs.push({
          stationId: station.id,
          qrCode: newQR
        });
      }

      // Guardar estaciones actualizadas
      localStorage.setItem('wmapp_stations', JSON.stringify(stations));

      return refreshedQRs;
    } catch (error) {
      console.error('[QREngine] QR refresh failed:', error);
      return [];
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private hasRequiredFields(payload: any): boolean {
    return payload &&
           typeof payload.stationId === 'string' &&
           typeof payload.companyId === 'string' &&
           typeof payload.timestamp === 'string' &&
           typeof payload.version === 'string' &&
           typeof payload.language === 'string' &&
           typeof payload.mode === 'string';
  }

  private isVersionCompatible(version: string): boolean {
    // Implementar lógica de compatibilidad de versiones
    const supportedVersions = ['1.0'];
    return supportedVersions.includes(version);
  }

  private async validateStation(stationId: string, companyId: string): Promise<Station | null> {
    try {
      const stations = JSON.parse(localStorage.getItem('wmapp_stations') || '[]');
      const station = stations.find((s: Station) => 
        s.id === stationId && 
        s.companyId === companyId && 
        s.isActive
      );
      return station || null;
    } catch {
      return null;
    }
  }

  private async generateSignature(payload: any): Promise<string> {
    if (!this.cryptoAvailable || !this.secretKey) return '';

    try {
      // Crear string para firmar (excluir la firma misma)
      const { signature, ...dataToSign } = payload as Record<string, unknown>;
      void signature;
      const dataString = JSON.stringify(dataToSign);
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);

      // Generar firma
      const signatureBuffer = await window.crypto.subtle.sign('HMAC', this.secretKey, data);
      const signatureArray = new Uint8Array(signatureBuffer);
      
      return btoa(String.fromCharCode(...signatureArray));
    } catch (error) {
      console.warn('[QREngine] Signature generation failed:', error);
      return '';
    }
  }

  private async validateSignature(payload: any): Promise<boolean> {
    if (!this.cryptoAvailable || !payload.signature || !this.secretKey) return true;

    try {
      const { signature, ...dataToVerify } = payload;
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(dataToVerify));
      const expected = await window.crypto.subtle.sign('HMAC', this.secretKey, data);
      const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected)));
      return expectedB64 === signature;
    } catch (error) {
      console.warn('[QREngine] Signature validation failed:', error);
      return false;
    }
  }

  private compressData(data: string): string {
    // Implementación simple de compresión
    // En producción usar LZString o similar
    return `COMPRESSED:${btoa(data)}`;
  }

  private decompressData(data: string): string {
    if (data.startsWith('COMPRESSED:')) {
      return atob(data.substring(11));
    }
    return data;
  }

  private isCompressed(data: string): boolean {
    return data.startsWith('COMPRESSED:');
  }
}

// Singleton instance
export const qrEngine = new QREngine();
