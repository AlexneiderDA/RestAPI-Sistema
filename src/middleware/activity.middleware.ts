// src/middleware/activity.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para registrar actividades automáticamente
 */
export const logActivity = (activityType: string, getDescription: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ejecutar la acción original
    next();

    // Registrar actividad después de la respuesta (no bloquear)
    res.on('finish', async () => {
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await ActivityService.logActivity(
            req.user.userId,
            activityType,
            getDescription(req),
            undefined,
            undefined,
            undefined,
            req
          );
        } catch (error) {
          console.error('Error logging activity in middleware:', error);
        }
      }
    });
  };
};