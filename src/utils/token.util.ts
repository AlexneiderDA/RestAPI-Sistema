import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/auth.config.js';

export interface TokenPayload {
  userId: number;
  email: string;
  role: number;
}

/**
 * Genera un JWT de autenticación
 * @param payload Datos a incluir en el token
 * @returns Token JWT firmado
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, AUTH_CONFIG.jwtSecret, {
    expiresIn: AUTH_CONFIG.jwtExpiresIn
  });
};

/**
 * Genera un token de actualización (refresh token)
 * @param userId ID del usuario
 * @returns Token de actualización
 */
export const generateRefreshToken = (userId: number): string => {
  return jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, {
    expiresIn: AUTH_CONFIG.refreshTokenExpiresIn
  });
};

/**
 * Verifica y decodifica un token JWT
 * @param token Token JWT a verificar
 * @returns Payload decodificado o null si es inválido
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, AUTH_CONFIG.jwtSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
};