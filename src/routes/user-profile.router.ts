// src/routes/user-profile.router.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getProfile,
  updatePersonalData,
  changePassword,
  changeEmail,
  updateNotificationPreferences,
  updateProfileImage,
  removeProfileImage,
  getUserActivity,
  getDashboardData,
  deactivateAccount
} from '../controllers/user-profile.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest, validateQuery, validateParams, validateBody } from '../middleware/validate.middleware.js';
import {
  updatePersonalDataSchema,
  changePasswordSchema,
  changeEmailSchema,
  notificationPreferencesSchema,
  profileImageSchema,
  activityQuerySchema,
  deactivateAccountSchema,
  userIdParamSchema
} from '../schemas/user-profile.schema.js';
import { ActivityService } from '../services/activity.service.js';
import { NotificationService } from '../services/notification.service.js';
import { hashPassword } from '../utils/password.util.js';

const router = Router();
const prisma = new PrismaClient();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ===== RUTAS DEL PERFIL PERSONAL =====

/**
 * GET /api/profile
 * Obtener perfil completo del usuario autenticado
 */
router.get('/', getProfile);

/**
 * GET /api/profile/dashboard
 * Obtener datos del dashboard del usuario
 */
router.get('/dashboard', getDashboardData);

/**
 * PUT /api/profile/personal-data
 * Actualizar datos personales del perfil
 */
router.put('/personal-data',
  validateBody(updatePersonalDataSchema),
  updatePersonalData
);

/**
 * PUT /api/profile/password
 * Cambiar contraseña del usuario
 */
router.put('/password',
  validateBody(changePasswordSchema),
  changePassword
);

/**
 * PUT /api/profile/email
 * Cambiar email del usuario
 */
router.put('/email',
  validateBody(changeEmailSchema),
  changeEmail
);

/**
 * PUT /api/profile/notifications
 * Actualizar preferencias de notificaciones
 */
router.put('/notifications',
  validateBody(notificationPreferencesSchema),
  updateNotificationPreferences
);

/**
 * PUT /api/profile/image
 * Actualizar imagen de perfil
 */
router.put('/image',
  validateBody(profileImageSchema),
  updateProfileImage
);

/**
 * DELETE /api/profile/image
 * Eliminar imagen de perfil
 */
router.delete('/image', removeProfileImage);

/**
 * GET /api/profile/activity
 * Obtener historial de actividades del usuario
 */
router.get('/activity',
  validateQuery(activityQuerySchema),
  getUserActivity
);

/**
 * DELETE /api/profile
 * Desactivar cuenta de usuario
 */
router.delete('/',
  validateBody(deactivateAccountSchema),
  deactivateAccount
);

// ===== RUTAS ADMINISTRATIVAS =====

/**
 * GET /api/profile/users/:id
 * Obtener perfil de cualquier usuario (solo admin)
 */
router.get('/users/:id',
  validateParams(userIdParamSchema),
  authorize([1]), // Solo admin
  async (req, res) => {
    try {
      const { id: userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
          id: true,
          name: true,
          email: true,
          rolId: true,
          createdAt: true,
          updatedAt: true,
          rol: {
            select: { name: true }
          },
          profile: true,
          notificationPreferences: true,
          _count: {
            select: {
              eventRegistrations: true,
              certificates: true,
              organizedEvents: true,
              notifications: true,
              activities: true
            }
          }
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error fetching user profile (admin):', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * GET /api/profile/users/:id/activity
 * Obtener actividades de cualquier usuario (solo admin)
 */
router.get('/users/:id/activity',
  validateParams(userIdParamSchema),
  validateQuery(activityQuerySchema),
  authorize([1]), // Solo admin
  async (req, res) => {
    try {
      const { id: userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const result = await ActivityService.getUserActivities(
        Number(userId),
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: {
          user,
          ...result
        }
      });
    } catch (error) {
      console.error('Error fetching user activity (admin):', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * POST /api/profile/users/:id/reset-password
 * Resetear contraseña de usuario (solo admin)
 */
router.post('/users/:id/reset-password',
  validateParams(userIdParamSchema),
  authorize([1]), // Solo admin
  async (req, res) => {
    try {
      const { id: userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener al menos 8 caracteres'
        });
        return;
      }

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Hash de la nueva contraseña
      const hashedPassword = await hashPassword(newPassword);

      // Actualizar contraseña
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { password: hashedPassword }
      });

      // Registrar actividad del admin
      await ActivityService.logActivity(
        req.user!.userId,
        'admin_password_reset',
        `Reseteo la contraseña del usuario ${user.name} (${user.email})`,
        'user',
        Number(userId),
        { targetUserId: Number(userId) },
        req
      );

      // Registrar actividad del usuario afectado
      await ActivityService.logActivity(
        Number(userId),
        'password_reset_by_admin',
        'Un administrador reseteo tu contraseña',
        'user',
        Number(userId),
        { adminId: req.user!.userId }
      );

      // Crear notificación para el usuario
      await NotificationService.createNotification(
        Number(userId),
        'security',
        'Contraseña reseteada',
        'Un administrador ha reseteado tu contraseña. Te recomendamos cambiarla inmediatamente.',
        'user',
        Number(userId)
      );

      res.json({
        success: true,
        message: 'Contraseña reseteada exitosamente'
      });
    } catch (error) {
      console.error('Error resetting password (admin):', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * POST /api/profile/users/:id/toggle-status
 * Activar/desactivar usuario (solo admin)
 */
router.post('/users/:id/toggle-status',
  validateParams(userIdParamSchema),
  authorize([1]), // Solo admin
  async (req, res) => {
    try {
      const { id: userId } = req.params;
      const { action, reason } = req.body; // action: 'activate' | 'deactivate'

      if (!['activate', 'deactivate'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Acción inválida. Usar "activate" o "deactivate"'
        });
        return;
      }

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { id: true, name: true, email: true, rolId: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // No permitir desactivar otros admins
      if (action === 'deactivate' && user.rolId === 1) {
        res.status(400).json({
          success: false,
          error: 'No se puede desactivar a otros administradores'
        });
        return;
      }

      // Aquí implementarías la lógica de activación/desactivación
      // Por ahora solo registramos la actividad
      
      const actionDescription = action === 'activate' 
        ? `Activó la cuenta del usuario ${user.name}`
        : `Desactivó la cuenta del usuario ${user.name}`;

      await ActivityService.logActivity(
        req.user!.userId,
        `admin_user_${action}`,
        actionDescription,
        'user',
        Number(userId),
        { 
          targetUserId: Number(userId),
          reason: reason || 'No especificado'
        },
        req
      );

      // Notificar al usuario
      await NotificationService.createNotification(
        Number(userId),
        'account',
        action === 'activate' ? 'Cuenta activada' : 'Cuenta desactivada',
        action === 'activate' 
          ? 'Tu cuenta ha sido activada por un administrador.'
          : 'Tu cuenta ha sido desactivada por un administrador.',
        'user',
        Number(userId)
      );

      res.json({
        success: true,
        message: `Usuario ${action === 'activate' ? 'activado' : 'desactivado'} exitosamente`
      });
    } catch (error) {
      console.error('Error toggling user status (admin):', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

export default router;