// src/routes/event.router.ts
import { Router, RequestHandler } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getFeaturedEvents
} from '../controllers/event.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { 
  createEventSchema, 
  updateEventSchema,
  eventQuerySchema,
  eventIdSchema
} from '../schemas/event.schema.js';

const router = Router();

// ===== RUTAS PÚBLICAS =====

/**
 * GET /api/events
 * Obtener todos los eventos con filtros y paginación
 */
router.get('/', 
  validateRequest(eventQuerySchema, 'query'), 
  getAllEvents
);

/**
 * GET /api/events/featured
 * Obtener eventos destacados (para carrusel)
 */
router.get('/featured', getFeaturedEvents);

/**
 * GET /api/events/:id
 * Obtener evento específico por ID
 */
router.get('/:id', 
  validateRequest(eventIdSchema, 'params'),
  getEventById
);

// ===== RUTAS PROTEGIDAS =====

// Middleware de autenticación para todas las rutas siguientes
router.use(authenticate);

/**
 * POST /api/events
 * Crear nuevo evento
 * Requiere: Role organizador (3) o admin (1)
 */
router.post('/', 
  authorize([1, 3]), // 1=admin, 3=organizador
  validateRequest(createEventSchema), 
  createEvent
);

/**
 * PUT /api/events/:id
 * Actualizar evento existente
 * Requiere: Ser el creador del evento o admin
 */
router.put('/:id',
  validateRequest(eventIdSchema, 'params'),
  validateRequest(updateEventSchema),
  updateEvent
);

/**
 * DELETE /api/events/:id
 * Eliminar evento (soft delete)
 * Requiere: Ser el creador del evento o admin
 */
router.delete('/:id',
  validateRequest(eventIdSchema, 'params'),
  deleteEvent
);

// ===== RUTAS ESPECÍFICAS DE GESTIÓN =====

/**
 * GET /api/events/:id/registrations
 * Obtener lista de registrados a un evento
 * Requiere: Ser el organizador del evento o admin
 */
router.get('/:id/registrations',
  validateRequest(eventIdSchema, 'params'),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica para obtener registrados
    res.json({ message: 'Lista de registrados - Por implementar' });
  }
);

/**
 * POST /api/events/:id/schedule
 * Agregar elemento al programa del evento
 * Requiere: Ser el organizador del evento o admin
 */
router.post('/:id/schedule',
  validateRequest(eventIdSchema, 'params'),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica para agregar al programa
    res.json({ message: 'Agregar al programa - Por implementar' });
  }
);

/**
 * POST /api/events/:id/sessions
 * Agregar sesión al evento
 * Requiere: Ser el organizador del evento o admin
 */
router.post('/:id/sessions',
  validateRequest(eventIdSchema, 'params'),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica para agregar sesión
    res.json({ message: 'Agregar sesión - Por implementar' });
  }
);

/**
 * POST /api/events/:id/duplicate
 * Duplicar evento existente
 * Requiere: Ser el organizador del evento o admin
 */
router.post('/:id/duplicate',
  validateRequest(eventIdSchema, 'params'),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica para duplicar evento
    res.json({ message: 'Duplicar evento - Por implementar' });
  }
);

/**
 * POST /api/events/:id/toggle-featured
 * Marcar/desmarcar evento como destacado
 * Requiere: Solo admin
 */
router.post('/:id/toggle-featured',
  validateRequest(eventIdSchema, 'params'),
  authorize([1]),
  async (req, res) => {
    // Implementar lógica para toggle featured
    res.json({ message: 'Toggle featured - Por implementar' });
  }
);

/**
 * GET /api/events/:id/stats
 * Obtener estadísticas del evento
 * Requiere: Ser el organizador del evento o admin
 */
router.get('/:id/stats',
  validateRequest(eventIdSchema, 'params'),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica de estadísticas
    res.json({ message: 'Estadísticas del evento - Por implementar' });
  }
);

export default router;