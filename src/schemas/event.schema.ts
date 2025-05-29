// src/schemas/event.schema.ts
import { z } from 'zod';

// Schema para crear eventos
export const createEventSchema = z.object({
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres'),
  
  shortDescription: z.string()
    .max(300, 'La descripción corta no puede exceder 300 caracteres')
    .optional(),
  
  imageUrl: z.string()
    .url('URL de imagen inválida')
    .optional(),
  
  startDate: z.string()
    .datetime('Fecha de inicio inválida'),
  
  endDate: z.string()
    .datetime('Fecha de fin inválida'),
  
  startTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora de inicio inválido (HH:MM)'),
  
  endTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora de fin inválido (HH:MM)'),
  
  location: z.string()
    .min(3, 'La ubicación debe tener al menos 3 caracteres')
    .max(200, 'La ubicación no puede exceder 200 caracteres'),
  
  address: z.string()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional(),
  
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  
  directions: z.string()
    .max(1000, 'Las indicaciones no pueden exceder 1000 caracteres')
    .optional(),
  
  categoryId: z.number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser positivo'),
  
  maxCapacity: z.number()
    .int('La capacidad máxima debe ser un número entero')
    .min(1, 'La capacidad máxima debe ser al menos 1')
    .max(10000, 'La capacidad máxima no puede exceder 10,000'),
  
  requiresCertificate: z.boolean()
    .default(false),
  
  isFeatured: z.boolean()
    .default(false),
  
  requirements: z.array(z.string().max(200))
    .max(10, 'No puedes agregar más de 10 requisitos')
    .optional(),
  
  tags: z.array(z.string().max(50))
    .max(20, 'No puedes agregar más de 20 etiquetas')
    .optional()
}).refine(data => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate > startDate;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["endDate"]
}).refine(data => {
  // Validar que la hora de inicio sea antes que la de fin (en el mismo día)
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["endTime"]
});

// Schema para actualizar eventos (todos los campos opcionales)
export const updateEventSchema = createEventSchema.partial().refine(data => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate > startDate;
  }
  return true;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["endDate"]
});

// Schema para query parameters de búsqueda
export const eventQuerySchema = z.object({
  page: z.string()
    .transform(val => parseInt(val) || 1)
    .refine(val => val > 0, 'La página debe ser mayor a 0')
    .optional(),
  
  limit: z.string()
    .transform(val => {
      const num = parseInt(val) || 10;
      return Math.min(Math.max(num, 1), 100); // Entre 1 y 100
    })
    .optional(),
  
  category: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, 'ID de categoría inválido')
    .optional(),
  
  search: z.string()
    .min(1, 'El término de búsqueda no puede estar vacío')
    .max(100, 'El término de búsqueda no puede exceder 100 caracteres')
    .optional(),
  
  featured: z.enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),
  
  startDate: z.string()
    .datetime('Fecha de inicio inválida')
    .optional(),
  
  endDate: z.string()
    .datetime('Fecha de fin inválida')
    .optional(),
  
  status: z.enum(['active', 'all', 'past'])
    .default('active'),
  
  sortBy: z.enum(['date', 'title', 'capacity', 'registrations'])
    .default('date'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('asc')
});

// Schema para programación de eventos
export const eventScheduleSchema = z.object({
  startTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  
  endTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido')
    .optional(),
  
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  
  speaker: z.string()
    .max(100, 'El nombre del ponente no puede exceder 100 caracteres')
    .optional(),
  
  location: z.string()
    .max(200, 'La ubicación no puede exceder 200 caracteres')
    .optional(),
  
  order: z.number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden debe ser mayor o igual a 0')
    .default(0)
});

// Schema para sesiones de eventos
export const eventSessionSchema = z.object({
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  
  description: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  
  startTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora de inicio inválido'),
  
  endTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora de fin inválido'),
  
  speaker: z.string()
    .max(200, 'El nombre del ponente no puede exceder 200 caracteres')
    .optional(),
  
  maxCapacity: z.number()
    .int('La capacidad debe ser un número entero')
    .min(1, 'La capacidad debe ser al menos 1')
    .optional(),
  
  requiresRegistration: z.boolean()
    .default(true),
  
  isActive: z.boolean()
    .default(true)
}).refine(data => {
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["endTime"]
});

// Schema para validar parámetros de ID
export const eventIdSchema = z.object({
  id: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, 'ID de evento inválido')
});

// Tipos inferidos
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type EventScheduleInput = z.infer<typeof eventScheduleSchema>;
export type EventSessionInput = z.infer<typeof eventSessionSchema>;
export type EventIdParams = z.infer<typeof eventIdSchema>;

// Función helper para validar coordinadas
export const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Función helper para validar fechas de evento
export const validateEventDates = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  return start > now && end > start;
};

// Schema compuesto para crear evento con programación y sesiones
export const createEventWithScheduleSchema = z.object({
  event: createEventSchema,
  schedule: z.array(eventScheduleSchema).optional(),
  sessions: z.array(eventSessionSchema).optional()
});

export type CreateEventWithScheduleInput = z.infer<typeof createEventWithScheduleSchema>;