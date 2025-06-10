// src/controllers/user-profile.controller.ts
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../utils/password.util.js';
import { ActivityService } from '../services/activity.service.js';
import { NotificationService } from '../services/notification.service.js';
import { 
  UpdatePersonalDataInput,
  ChangePasswordInput,
  ChangeEmailInput,
  NotificationPreferencesInput,
  ProfileImageInput 
} from '../schemas/user-profile.schema.js';

const prisma = new PrismaClient();

/**
 * GET /api/profile
 * Obtener perfil completo del usuario autenticado
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
            eventRegistrations: { where: { status: 'registered' } },
            certificates: { where: { status: 'issued' } },
            organizedEvents: { where: { isActive: true } }
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

    // Obtener estadísticas adicionales
    const [upcomingEvents, pastEvents, unreadNotifications] = await Promise.all([
      prisma.eventRegistration.count({
        where: {
          userId,
          status: 'registered',
          event: {
            startDate: { gte: new Date() }
          }
        }
      }),
      prisma.eventRegistration.count({
        where: {
          userId,
          status: 'attended',
          event: {
            endDate: { lt: new Date() }
          }
        }
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
    ]);

    const profileData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.rol.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      profile: user.profile || {
        firstName: null,
        lastName: null,
        phone: null,
        institution: null,
        occupation: null,
        biography: null,
        profileImageUrl: null,
        dateOfBirth: null,
        country: null,
        city: null,
        socialLinks: null
      },
      notificationPreferences: user.notificationPreferences || {
        emailNewEvents: true,
        emailEventReminders: true,
        emailCertificatesAvailable: true,
        emailNewsletter: false,
        platformNewEvents: true,
        platformEventReminders: true,
        platformCertificatesAvailable: true,
        platformUpdates: false
      },
      statistics: {
        totalRegistrations: user._count.eventRegistrations,
        totalCertificates: user._count.certificates,
        organizedEvents: user._count.organizedEvents,
        upcomingEvents,
        pastEvents,
        unreadNotifications
      }
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/profile/personal-data
 * Actualizar datos personales del perfil
 */
export const updatePersonalData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const profileData: UpdatePersonalDataInput = req.body;

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Upsert del perfil
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...profileData,
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        ...profileData,
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null
      }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'profile_updated',
      'Actualizó su información personal',
      'user',
      userId,
      { fields: Object.keys(profileData) },
      req
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating personal data:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/profile/password
 * Cambiar contraseña del usuario
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword }: ChangePasswordInput = req.body;

    // Obtener usuario con contraseña actual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
      return;
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
      return;
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await hashPassword(newPassword);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'password_changed',
      'Cambió su contraseña',
      'user',
      userId,
      { timestamp: new Date() },
      req
    );

    // Crear notificación de seguridad
    await NotificationService.createNotification(
      userId,
      'security',
      'Contraseña actualizada',
      'Tu contraseña ha sido cambiada exitosamente. Si no fuiste tú, contacta al soporte.'
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/profile/email
 * Cambiar email del usuario
 */
export const changeEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { newEmail, currentPassword }: ChangeEmailInput = req.body;

    // Obtener usuario actual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Contraseña incorrecta'
      });
      return;
    }

    // Verificar que el email sea diferente
    if (newEmail === user.email) {
      res.status(400).json({
        success: false,
        error: 'El nuevo email debe ser diferente al actual'
      });
      return;
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Este email ya está registrado'
      });
      return;
    }

    // Actualizar email
    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'email_updated',
      `Cambió su email de ${user.email} a ${newEmail}`,
      'user',
      userId,
      { oldEmail: user.email, newEmail },
      req
    );

    // Crear notificación
    await NotificationService.createNotification(
      userId,
      'security',
      'Email actualizado',
      `Tu email ha sido cambiado a ${newEmail}. Si no fuiste tú, contacta al soporte.`
    );

    res.json({
      success: true,
      message: 'Email actualizado exitosamente',
      data: { newEmail }
    });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/profile/notifications
 * Actualizar preferencias de notificaciones
 */
export const updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const preferences: NotificationPreferencesInput = req.body;

    // Upsert de preferencias
    const updatedPreferences = await prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        ...preferences,
        updatedAt: new Date()
      },
      create: {
        userId,
        ...preferences
      }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'notification_preferences_updated',
      'Actualizó sus preferencias de notificaciones',
      'user',
      userId,
      preferences,
      req
    );

    res.json({
      success: true,
      message: 'Preferencias de notificación actualizadas',
      data: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/profile/image
 * Actualizar imagen de perfil
 */
export const updateProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { imageUrl }: ProfileImageInput = req.body;

    // Upsert del perfil con nueva imagen
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        profileImageUrl: imageUrl,
        updatedAt: new Date()
      },
      create: {
        userId,
        profileImageUrl: imageUrl
      }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'profile_image_updated',
      'Actualizó su imagen de perfil',
      'user',
      userId,
      { imageUrl },
      req
    );

    res.json({
      success: true,
      message: 'Imagen de perfil actualizada',
      data: {
        profileImageUrl: updatedProfile.profileImageUrl
      }
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * DELETE /api/profile/image
 * Eliminar imagen de perfil
 */
export const removeProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    await prisma.userProfile.updateMany({
      where: { userId },
      data: {
        profileImageUrl: null,
        updatedAt: new Date()
      }
    });

    // Registrar actividad
    await ActivityService.logActivity(
      userId,
      'profile_image_removed',
      'Eliminó su imagen de perfil',
      'user',
      userId,
      {},
      req
    );

    res.json({
      success: true,
      message: 'Imagen de perfil eliminada'
    });
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/profile/activity
 * Obtener historial de actividades del usuario
 */
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 20 } = req.query;

    const result = await ActivityService.getUserActivities(
      userId,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/profile/dashboard
 * Obtener datos del dashboard del usuario
 */
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Obtener registros próximos
    const upcomingEvents = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: 'registered',
        event: {
          startDate: { gte: new Date() }
        }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            startTime: true,
            location: true,
            imageUrl: true,
            category: {
              select: { name: true, color: true }
            }
          }
        }
      },
      take: 5,
      orderBy: {
        event: { startDate: 'asc' }
      }
    });

    // Obtener certificados recientes
    const recentCertificates = await prisma.certificate.findMany({
      where: {
        userId,
        status: 'issued'
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            endDate: true
          }
        }
      },
      take: 5,
      orderBy: { issuedDate: 'desc' }
    });

    // Obtener notificaciones recientes
    const { notifications } = await NotificationService.getUserNotifications(userId, 1, 5);

    // Estadísticas rápidas
    const [totalEvents, totalCertificates, eventsThisMonth] = await Promise.all([
      prisma.eventRegistration.count({
        where: { userId, status: 'attended' }
      }),
      prisma.certificate.count({
        where: { userId, status: 'issued' }
      }),
      prisma.eventRegistration.count({
        where: {
          userId,
          status: 'registered',
          registrationDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        upcomingEvents: upcomingEvents.map(reg => ({
          id: reg.id,
          event: reg.event,
          registrationDate: reg.registrationDate,
          qrCode: reg.qrCode
        })),
        recentCertificates,
        recentNotifications: notifications,
        statistics: {
          totalEventsAttended: totalEvents,
          totalCertificates,
          eventsThisMonth
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * DELETE /api/profile
 * Desactivar cuenta de usuario (soft delete)
 */
export const deactivateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, reason } = req.body;

    // Verificar contraseña
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Contraseña incorrecta'
      });
      return;
    }

    // Verificar que no tiene eventos próximos como organizador
    const upcomingOrganizedEvents = await prisma.event.count({
      where: {
        organizerId: userId,
        startDate: { gte: new Date() },
        isActive: true
      }
    });

    if (upcomingOrganizedEvents > 0) {
      res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu cuenta mientras tengas eventos próximos como organizador'
      });
      return;
    }

    // Implementar lógica de desactivación
    // Por ahora solo registramos la actividad
    await ActivityService.logActivity(
      userId,
      'account_deactivation_requested',
      'Solicitó desactivar su cuenta',
      'user',
      userId,
      { reason: reason || 'No especificado' },
      req
    );

    res.json({
      success: true,
      message: 'Solicitud de desactivación registrada. Un administrador revisará tu solicitud.'
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};