import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware para validar el cuerpo de la solicitud contra un esquema Zod
 * @param schema Esquema Zod para validación
 */
export const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
        
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors
        });
      }
      
      // Para otros tipos de errores
      return res.status(400).json({ error: 'Invalid request data' });
    }
  };
};