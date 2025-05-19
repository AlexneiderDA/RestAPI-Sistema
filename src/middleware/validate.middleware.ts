import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

/**
 * Middleware para validar el cuerpo de la solicitud contra un esquema Zod
 * @param schema Esquema Zod para validación
 */
export const validateRequest = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validar el cuerpo de la solicitud contra el esquema
      schema.parse(req.body);
      next();
    } catch (error) {
      // En caso de error de validación, devolver errores formateados
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors
        });
        return;
      }
      
      // Para otros tipos de errores
      res.status(400).json({ error: 'Invalid request data' });
      return;
    }
  };
};