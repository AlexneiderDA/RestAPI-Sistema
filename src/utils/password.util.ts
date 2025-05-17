import bcrypt from 'bcrypt';
import { AUTH_CONFIG } from '../config/auth.config.js';

/**
 * Genera un hash seguro de la contraseña
 * @param plainPassword Contraseña en texto plano
 * @returns Contraseña hasheada
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  const salt = await bcrypt.genSalt(AUTH_CONFIG.saltRounds);
  return bcrypt.hash(plainPassword, salt);
};

/**
 * Verifica si una contraseña coincide con su hash
 * @param plainPassword Contraseña en texto plano
 * @param hashedPassword Hash almacenado de la contraseña
 * @returns true si la contraseña es correcta, false en caso contrario
 */
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};