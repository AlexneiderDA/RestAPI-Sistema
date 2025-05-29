// src/controllers/registration.controller.ts
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { generateQRCode } from '../utils/qr.util.js';
import { NotificationService } from '../services/notification.service.js';
import { EmailService } from '../services/email.services.js';

const prisma = new PrismaClient();

/**
 * POST /api/events/:id/register
 * Registrarse a un evento
 */
export const registerToEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user!.userId;
    const { sessionIds = [], personalInfo } = req.body;

    // Verificar que el evento existe y está activo
    const event = await prisma.event.findUnique({
      where: { id: Number(eventId), isActive: true },
      include: { 
        sessions: true,
        _count: { 
          select: { registrations: { where: { status: 'registered' } } } 
        }
      }
    });

    if (!event) {
      res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o inactivo' 
      });
      return;
    }

    // Verificar que el evento no ha comenzado
    if (new Date() >= event.startDate) {
      res.status(400).json({ 
        success: false,
        error: 'No se puede registrar a un evento que ya ha comenzado' 
      });
      return;
    }

    // Verificar capacidad disponible
    if (event._count.registrations >= event.maxCapacity) {
      res.status(400).json({ 
        success: false,
        error: 'Evento lleno - No hay cupos disponibles' 
      });
      return;
    }

    // Verificar si ya está registrado
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: { 
        userId_eventId: { userId, eventId: Number(eventId) }
      }
    });

    if (existingRegistration) {
      const statusMessage = existingRegistration.status === 'cancelled' 
        ? 'Tu registro fue cancelado. Contacta al organizador para re-registrarte.'
        : 'Ya estás registrado en este evento';
      
      res.status(400).json({ 
        success: false,
        error: statusMessage,
        registration: {
          id: existingRegistration.id,
          status: existingRegistration.status,
          registrationDate: existingRegistration.registrationDate
        }
      });
      return;
    }

    // Validar sesiones si se proporcionaron
    if (sessionIds.length > 0) {
      const validSessions = await prisma.eventSession.findMany({
        where: {
          id: { in: sessionIds },
          eventId: Number(eventId),
          isActive: true,
          requiresRegistration: true
        }
      });

      if (validSessions.length !== sessionIds.length) {
        res.status(400).json({ 
          success: false,
          error: 'Una o más sesiones seleccionadas no son válidas' 
        });
        return;
      }

      // Verificar capacidad de sesiones
      for (const session of validSessions) {
        if (session.maxCapacity) {
          const registrationCount = await prisma.sessionRegistration.count({
            where: { sessionId: session.id }
          });
          
          if (registrationCount >= session.maxCapacity) {
            res.status(400).json({ 
              success: false,
              error: `La sesión "${session.title}" está llena` 
            });
            return;
          }
        }
      }
    }

    // Crear registro en transacción
    const registration = await prisma.$transaction(async (tx) => {
      // 1. Crear registro principal
      const newRegistration = await tx.eventRegistration.create({
        data: {
          userId,
          eventId: Number(eventId),
          qrCode: generateQRCode(`event-${eventId}-user-${userId}`),
          notes: personalInfo?.notes || null
        }
      });

      // 2. Registrar en sesiones específicas
      if (sessionIds.length > 0) {
        await tx.sessionRegistration.createMany({
          data: sessionIds.map((sessionId: number) => ({
            eventRegistrationId: newRegistration.id,
            sessionId
          }))
        });

        // Actualizar contador de registros en sesiones
        for (const sessionId of sessionIds) {
          await tx.eventSession.update({
            where: { id: sessionId },
            data: { currentRegistrations: { increment: 1 } }
          });
        }
      }

      // 3. Actualizar contador de registros del evento
      await tx.event.update({
        where: { id: Number(eventId) },
        data: { currentRegistrations: { increment: 1 } }
      });

      // 4. Crear actividad de usuario
      await tx.userActivity.create({
        data: {
          userId,
          activityType: 'event_registered',
          description: `Se registró al evento "${event.title}"`,
          relatedEntityType: 'event',
          relatedEntityId: event.id,
          metadata: {
            eventTitle: event.title,
            sessionCount: sessionIds.length
          }
        }
      });

      return newRegistration;
    });

    // Obtener registro completo con relaciones
    const completeRegistration = await prisma.eventRegistration.findUnique({
      where: { id: registration.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            startTime: true,
            location: true
          }
        },
        sessionRegistrations: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true
              }
            }
          }
        }
      }
    });

    // Crear notificación
    await NotificationService.createNotification(
      userId,
      'event',
      'Registro confirmado',
      `Te has registrado exitosamente al evento "${event.title}"`,
      'event',
      event.id
    );

    // Enviar email de confirmación (proceso asíncrono)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (user) {
      EmailService.sendEventConfirmation(user.email, {
        userName: user.name,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventTime: event.startTime,
        eventLocation: event.location,
        qrCode: registration.qrCode,
        sessions: completeRegistration?.sessionRegistrations.map(sr => sr.session) || []
      }).catch(error => {
        console.error('Error sending confirmation email:', error);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registro exitoso',
      data: {
        registration: {
          id: completeRegistration!.id,
          registrationDate: completeRegistration!.registrationDate,
          qrCode: completeRegistration!.qrCode,
          status: completeRegistration!.status
        },
        event: completeRegistration!.event,
        sessions: completeRegistration!.sessionRegistrations.map(sr => sr.session),
        availableSlots: event.maxCapacity - (event._count.registrations + 1)
      }
    });
  } catch (error) {
    console.error('Error registering to event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * DELETE /api/registrations/:id
 * Cancelar registro a un evento
 */
export const cancelRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: registrationId } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;

    // Verificar que el registro existe y pertenece al usuario
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        id: Number(registrationId),
        userId,
        status: 'registered'
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            organizerId: true
          }
        },
        sessionRegistrations: true
      }
    });

    if (!registration) {
      res.status(404).json({ 
        success: false,
        error: 'Registro no encontrado o ya cancelado' 
      });
      return;
    }

    // Verificar que se puede cancelar (por ejemplo, 24 horas antes)
    const hoursUntilEvent = (registration.event.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilEvent < 24) {
      res.status(400).json({ 
        success: false,
        error: 'No se puede cancelar el registro con menos de 24 horas de anticipación' 
      });
      return;
    }

    // Cancelar registro en transacción
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado del registro
      await tx.eventRegistration.update({
        where: { id: Number(registrationId) },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason || null
        }
      });

      // 2. Eliminar registros de sesiones
      if (registration.sessionRegistrations.length > 0) {
        await tx.sessionRegistration.deleteMany({
          where: { eventRegistrationId: Number(registrationId) }
        });

        // Actualizar contadores de sesiones
        for (const sessionReg of registration.sessionRegistrations) {
          await tx.eventSession.update({
            where: { id: sessionReg.sessionId },
            data: { currentRegistrations: { decrement: 1 } }
          });
        }
      }

      // 3. Actualizar contador del evento
      await tx.event.update({
        where: { id: registration.event.id },
        data: { currentRegistrations: { decrement: 1 } }
      });

      // 4. Crear actividad de usuario
      await tx.userActivity.create({
        data: {
          userId,
          activityType: 'event_cancelled',
          description: `Canceló su registro al evento "${registration.event.title}"`,
          relatedEntityType: 'event',
          relatedEntityId: registration.event.id,
          metadata: {
            eventTitle: registration.event.title,
            reason: reason || null
          }
        }
      });
    });

    // Notificar al organizador
    await NotificationService.createNotification(
      registration.event.organizerId,
      'event',
      'Cancelación de registro',
      `Un participante canceló su registro al evento "${registration.event.title}"`,
      'event',
      registration.event.id
    );

    // Crear notificación para el usuario
    await NotificationService.createNotification(
      userId,
      'event',
      'Registro cancelado',
      `Has cancelado tu registro al evento "${registration.event.title}"`,
      'event',
      registration.event.id
    );

    res.json({
      success: true,
      message: 'Registro cancelado exitosamente'
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * GET /api/users/:id/registrations
 * Obtener registros de un usuario
 */
export const getUserRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = req.params;
    const currentUserId = req.user!.userId;
    const userRole = req.user!.role;
    
    const { status, page = 1, limit = 10 } = req.query;

    // Verificar permisos
    if (userRole !== 1 && Number(userId) !== currentUserId) {
      res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para ver estos registros' 
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    // Construir filtros
    const where: any = { userId: Number(userId) };
    if (status) where.status = status;

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              startTime: true,
              endTime: true,
              location: true,
              imageUrl: true,
              category: {
                select: { name: true, color: true }
              }
            }
          },
          sessionRegistrations: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  startTime: true,
                  endTime: true
                }
              }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { registrationDate: 'desc' }
      }),
      prisma.eventRegistration.count({ where })
    ]);

    // Agregar estado del evento
    const registrationsWithEventStatus = registrations.map(registration => {
      const now = new Date();
      const eventStart = registration.event.startDate;
      const eventEnd = registration.event.endDate;
      
      let eventStatus = 'upcoming';
      if (now >= eventStart && now <= eventEnd) {
        eventStatus = 'ongoing';
      } else if (now > eventEnd) {
        eventStatus = 'finished';
      }

      return {
        ...registration,
        event: {
          ...registration.event,
          status: eventStatus
        }
      };
    });

    res.json({
      success: true,
      data: {
        registrations: registrationsWithEventStatus,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * GET /api/registrations/:id
 * Obtener detalles de un registro específico
 */
export const getRegistrationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: registrationId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(registrationId) },
      include: {
        event: {
          include: {
            category: true,
            organizer: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        sessionRegistrations: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                description: true,
                startTime: true,
                endTime: true,
                speaker: true
              }
            }
          }
        }
      }
    });

    if (!registration) {
      res.status(404).json({ 
        success: false,
        error: 'Registro no encontrado' 
      });
      return;
    }

    // Verificar permisos
    const canView = userRole === 1 || // Admin
                   registration.userId === userId || // Propio registro
                   registration.event.organizerId === userId; // Organizador del evento

    if (!canView) {
      res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para ver este registro' 
      });
      return;
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * POST /api/registrations/:id/check-in
 * Marcar asistencia de entrada a un evento
 */
export const checkInRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: registrationId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(registrationId) },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            organizerId: true
          }
        }
      }
    });

    if (!registration) {
      res.status(404).json({ 
        success: false,
        error: 'Registro no encontrado' 
      });
      return;
    }

    // Verificar permisos (solo organizador o admin)
    if (userRole !== 1 && registration.event.organizerId !== userId) {
      res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para marcar asistencia' 
      });
      return;
    }

    // Verificar que el evento está en curso
    const now = new Date();
    if (now < registration.event.startDate || now > registration.event.endDate) {
      res.status(400).json({ 
        success: false,
        error: 'Solo se puede marcar asistencia durante el evento' 
      });
      return;
    }

    // Verificar que no se haya marcado ya
    if (registration.attendanceCheckedIn) {
      res.status(400).json({ 
        success: false,
        error: 'La asistencia ya fue marcada',
        data: {
          checkedInAt: registration.attendanceCheckedIn
        }
      });
      return;
    }

    // Marcar asistencia
    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: Number(registrationId) },
      data: {
        attendanceCheckedIn: new Date(),
        status: 'attended'
      }
    });

    // Crear actividad
    await prisma.userActivity.create({
      data: {
        userId: registration.userId,
        activityType: 'event_attended',
        description: `Marcó asistencia al evento "${registration.event.title}"`,
        relatedEntityType: 'event',
        relatedEntityId: registration.event.id
      }
    });

    res.json({
      success: true,
      message: 'Asistencia marcada exitosamente',
      data: {
        checkedInAt: updatedRegistration.attendanceCheckedIn
      }
    });
  } catch (error) {
    console.error('Error checking in registration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * POST /api/registrations/:id/check-out
 * Marcar asistencia de salida de un evento
 */
export const checkOutRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: registrationId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(registrationId) },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            organizerId: true,
            requiresCertificate: true
          }
        }
      }
    });

    if (!registration) {
      res.status(404).json({ 
        success: false,
        error: 'Registro no encontrado' 
      });
      return;
    }

    // Verificar permisos
    if (userRole !== 1 && registration.event.organizerId !== userId) {
      res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para marcar salida' 
      });
      return;
    }

    // Verificar que se haya marcado entrada
    if (!registration.attendanceCheckedIn) {
      res.status(400).json({ 
        success: false,
        error: 'Debe marcar entrada antes de marcar salida' 
      });
      return;
    }

    // Verificar que no se haya marcado salida ya
    if (registration.attendanceCheckedOut) {
      res.status(400).json({ 
        success: false,
        error: 'La salida ya fue marcada',
        data: {
          checkedOutAt: registration.attendanceCheckedOut
        }
      });
      return;
    }

    // Marcar salida
    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: Number(registrationId) },
      data: {
        attendanceCheckedOut: new Date()
      }
    });

    // Si el evento requiere certificado, crear registro para generación
    if (registration.event.requiresCertificate) {
      await prisma.certificate.create({
        data: {
          userId: registration.userId,
          eventId: registration.event.id,
          eventRegistrationId: registration.id,
          certificateNumber: `CERT-${registration.event.id}-${registration.userId}-${Date.now()}`,
          title: `Constancia de Participación - ${registration.event.title}`,
          participationType: 'participant',
          verificationCode: `VER-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          status: 'pending'
        }
      });

      // Notificar que el certificado estará disponible
      await NotificationService.createNotification(
        registration.userId,
        'certificate',
        'Constancia en proceso',
        `Tu constancia del evento "${registration.event.title}" estará disponible en 5 días hábiles`,
        'event',
        registration.event.id
      );
    }

    res.json({
      success: true,
      message: 'Salida marcada exitosamente',
      data: {
        checkedOutAt: updatedRegistration.attendanceCheckedOut,
        certificateWillBeGenerated: registration.event.requiresCertificate
      }
    });
  } catch (error) {
    console.error('Error checking out registration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};