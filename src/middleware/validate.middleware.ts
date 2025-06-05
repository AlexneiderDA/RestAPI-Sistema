import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

/**
 * Middleware para validar diferentes partes de la solicitud contra un esquema Zod
 * @param schema Esquema Zod para validación
 * @param target Parte de la request a validar ('body', 'query', 'params')
 */
export const validateRequest = (schema: ZodType<any>, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate;
      
      // Seleccionar qué parte de la request validar
      switch (target) {
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'body':
        default:
          dataToValidate = req.body;
          break;
      }

      // Validar los datos contra el esquema
      const validatedData = schema.parse(dataToValidate);
      
      // Reemplazar los datos originales con los validados y transformados
      switch (target) {
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
        case 'body':
        default:
          req.body = validatedData;
          break;
      }
      
      next();
    } catch (error) {
      // En caso de error de validación, devolver errores formateados
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          target,
          details: formattedErrors
        });
        return;
      }
      
      // Para otros tipos de errores
      res.status(400).json({ 
        success: false,
        error: 'Invalid request data',
        target 
      });
      return;
    }
  };
};

/**
 * Middleware específico para validar solo el body (retrocompatibilidad)
 */
export const validateBody = (schema: ZodType<any>) => {
  return validateRequest(schema, 'body');
};

/**
 * Middleware específico para validar solo query parameters
 */
export const validateQuery = (schema: ZodType<any>) => {
  return validateRequest(schema, 'query');
};

/**
 * Middleware específico para validar solo params
 */
export const validateParams = (schema: ZodType<any>) => {
  return validateRequest(schema, 'params');
};