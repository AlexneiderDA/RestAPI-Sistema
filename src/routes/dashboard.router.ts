// src/routes/dashboard.router.ts
import { Router } from 'express';
import {
  getOrganizerStats,
  getOrganizerUpcomingEvents,
  getOrganizerNotifications,
  markNotificationAsRead,
  getOrganizerRecentActivity
} from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ===== RUTAS DEL DASHBOARD DEL ORGANIZADOR =====

/**
 * GET /api/dashboard/organizer/stats
 * Obtener estadísticas generales del organizador
 * Requiere: Ser organizador (role 3) o admin (role 1)
 */
router.get('/organizer/stats', 
  authorize([1, 3]), // Admin o Organizador
  getOrganizerStats
);

/**
 * GET /api/dashboard/organizer/upcoming-events
 * Obtener próximos eventos del organizador
 * Requiere: Ser organizador (role 3) o admin (role 1)
 */
router.get('/organizer/upcoming-events',
  authorize([1, 3]),
  getOrganizerUpcomingEvents
);

/**
 * GET /api/dashboard/organizer/notifications
 * Obtener notificaciones del organizador
 * Requiere: Ser organizador (role 3) o admin (role 1)
 */
router.get('/organizer/notifications',
  authorize([1, 3]),
  getOrganizerNotifications
);

/**
 * POST /api/dashboard/organizer/notifications/:id/read
 * Marcar notificación como leída
 * Requiere: Ser organizador (role 3) o admin (role 1)
 */
router.post('/organizer/notifications/:id/read',
  authorize([1, 3]),
  markNotificationAsRead
);

/**
 * GET /api/dashboard/organizer/recent-activity
 * Obtener actividad reciente del organizador
 * Requiere: Ser organizador (role 3) o admin (role 1)
 */
router.get('/organizer/recent-activity',
  authorize([1, 3]),
  getOrganizerRecentActivity
);

// ===== RUTAS FUTURAS PARA DASHBOARD ADMIN =====

/**
 * GET /api/dashboard/admin/stats
 * Estadísticas del administrador (futuro)
 */
router.get('/admin/stats',
  authorize([1]), // Solo Admin
  async (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard de administrador - Por implementar',
      data: {
        placeholder: 'Estadísticas generales del sistema'
      }
    });
  }
);

/**
 * GET /api/dashboard/admin/system-health
 * Estado del sistema (futuro)
 */
router.get('/admin/system-health',
  authorize([1]),
  async (req, res) => {
    res.json({
      success: true,
      message: 'Estado del sistema - Por implementar',
      data: {
        placeholder: 'Métricas de rendimiento del sistema'
      }
    });
  }
);

// ===== RUTAS FUTURAS PARA DASHBOARD USUARIO =====

/**
 * GET /api/dashboard/user/summary
 * Resumen del usuario (futuro)
 */
router.get('/user/summary',
  async (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard de usuario - Por implementar',
      data: {
        placeholder: 'Eventos registrados, constancias, etc.'
      }
    });
  }
);

export default router;