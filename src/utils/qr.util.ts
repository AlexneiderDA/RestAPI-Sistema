// src/utils/qr.util.ts
import crypto from 'crypto';

/**
 * Genera un código QR único para un registro
 */
export const generateQRCode = (data: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  const hash = crypto.createHash('sha256').update(`${data}-${timestamp}-${randomBytes}`).digest('hex');
  
  return `QR-${hash.substring(0, 12).toUpperCase()}`;
};

/**
 * Valida formato de código QR
 */
export const validateQRCode = (qrCode: string): boolean => {
  const qrPattern = /^QR-[A-F0-9]{12}$/;
  return qrPattern.test(qrCode);
};

/**
 * Genera datos para el QR code (para mostrar en la app)
 */
export const generateQRData = (registrationId: number, eventId: number, userId: number) => {
  return {
    type: 'event_registration',
    registrationId,
    eventId,
    userId,
    timestamp: Date.now()
  };
};