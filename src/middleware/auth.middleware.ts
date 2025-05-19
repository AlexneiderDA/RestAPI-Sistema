import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token.util.js';

// Extender la interfaz Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware para verificar si el usuario está autenticado
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Obtener token del header Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    return;
  }

  // Verificar token
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
    return;
  }

  // Añadir información del usuario al request para uso en controladores
  req.user = decoded;
  next();
};

/**
 * Middleware para verificar roles de usuario
 * @param allowedRoles Array de IDs de roles permitidos
 */
export const authorize = (allowedRoles: number[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permiso para acceder a este recurso.' });
      return;
    }

    next();
  };
};