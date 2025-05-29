// src/schemas/registration.schema.ts
import { z } from 'zod';

// Schema para registrarse a un evento
export const registerToEventSchema = z.object({
  sessionIds: z.array(z.number().int().positive())
    .max(10, 'No puedes registrarte a más de 10 sesiones')
    .optional(),
  
  personalInfo: z.object({
    notes: z.string()
      .max(500, 'Las notas no pueden exceder 500 caracteres')
      .optional(),
    
    specialRequirements: z.string()
      .max(300, 'Los requerimientos especiales no pueden exceder 300 caracteres')
      .optional(),
    
    emergencyContact: z.object({
      name: z.string().max(100),
      phone: z.string().max(20)
    }).optional()
  }).optional()
});

// Schema para cancelar registro
export const cancelRegistrationSchema = z.object({
  reason: z.string()
    .min(5, 'Debe proporcionar una razón de al menos 5 caracteres')
    .max(500, 'La razón no puede exceder 500 caracteres')
    .optional()
});

// Schema para consultar registros
export const registrationQuerySchema = z.object({
  status: z.enum(['registered', 'cancelled', 'attended', 'no-show']).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  eventId: z.string().transform(Number).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema para check-in/check-out
export const attendanceSchema = z.object({
  notes: z.string()
    .max(200, 'Las notas no pueden exceder 200 caracteres')
    .optional()
});

// Schema para parámetros de ID
export const registrationIdSchema = z.object({
  id: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, 'ID de registro inválido')
});

// Tipos inferidos
export type RegisterToEventInput = z.infer<typeof registerToEventSchema>;
export type CancelRegistrationInput = z.infer<typeof cancelRegistrationSchema>;
export type RegistrationQueryInput = z.infer<typeof registrationQuerySchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type RegistrationIdParams = z.infer<typeof registrationIdSchema>;