// src/routes/event.router.ts (Corrección)
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
import { validateRequest, validateQuery, validateParams, validateBody } from '../middleware/validate.middleware.js';
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
  validateQuery(eventQuerySchema), 
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
  validateParams(eventIdSchema),
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
  validateBody(createEventSchema), 
  createEvent
);

/**
 * PUT /api/events/:id
 * Actualizar evento existente
 * Requiere: Ser el creador del evento o admin
 */
router.put('/:id',
  validateParams(eventIdSchema),
  validateBody(updateEventSchema),
  updateEvent
);

/**
 * DELETE /api/events/:id
 * Eliminar evento (soft delete)
 * Requiere: Ser el creador del evento o admin
 */
router.delete('/:id',
  validateParams(eventIdSchema),
  deleteEvent
);

// ===== RUTAS ESPECÍFICAS DE GESTIÓN =====

/**
 * GET /api/events/:id/registrations
 * Obtener lista de registrados a un evento
 * Requiere: Ser el organizador del evento o admin
 */
router.get('/:id/registrations',
  validateParams(eventIdSchema),
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
  validateParams(eventIdSchema),
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
  validateParams(eventIdSchema),
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
  validateParams(eventIdSchema),
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
  validateParams(eventIdSchema),
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
  validateParams(eventIdSchema),
  authorize([1, 3]),
  async (req, res) => {
    // Implementar lógica de estadísticas
    res.json({ message: 'Estadísticas del evento - Por implementar' });
  }
);

export default router;