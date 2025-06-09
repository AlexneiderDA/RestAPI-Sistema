// src/controllers/dashboard.controller.ts
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

/**
 * GET /api/dashboard/organizer/stats
 * Obtener estadísticas del organizador
 */
export const getOrganizerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = req.user!.userId;
    const userRole = req.user!.role;

    // Verificar que sea organizador o admin
    if (userRole !== 1 && userRole !== 3) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a estas estadísticas'
      });
      return;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Consultas en paralelo para optimizar rendimiento
    const [
      // Eventos del organizador
      totalEvents,
      activeEvents,
      upcomingEvents,
      completedEvents,
      
      // Registros totales
      totalRegistrations,
      todayRegistrations,
      
      // Asistencias de hoy
      todayAttendance,
      
      // Constancias emitidas
      totalCertificates,
      todayCertificates,
      
      // Eventos de este mes vs mes anterior para trends
      thisMonthEvents,
      lastMonthEvents,
      thisMonthRegistrations,
      lastMonthRegistrations
    ] = await Promise.all([
      // Eventos
      prisma.event.count({
        where: { organizerId, isActive: true }
      }),
      
      prisma.event.count({
        where: {
          organizerId,
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today }
        }
      }),
      
      prisma.event.count({
        where: {
          organizerId,
          isActive: true,
          startDate: { gt: today }
        }
      }),
      
      prisma.event.count({
        where: {
          organizerId,
          isActive: true,
          endDate: { lt: today }
        }
      }),

      // Registros totales en eventos del organizador
      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          status: { in: ['registered', 'attended'] }
        }
      }),

      // Registros de hoy
      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          registrationDate: {
            gte: todayStart,
            lt: todayEnd
          },
          status: { in: ['registered', 'attended'] }
        }
      }),

      // Asistencias de hoy (check-ins)
      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          attendanceCheckedIn: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),

      // Constancias totales
      prisma.certificate.count({
        where: {
          event: { organizerId },
          status: { in: ['issued', 'downloaded'] }
        }
      }),

      // Constancias emitidas hoy
      prisma.certificate.count({
        where: {
          event: { organizerId },
          issuedDate: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),

      // Para calcular trends
      prisma.event.count({
        where: {
          organizerId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: today
          }
        }
      }),

      prisma.event.count({
        where: {
          organizerId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            lt: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      }),

      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          registrationDate: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: today
          }
        }
      }),

      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          registrationDate: {
            gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            lt: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      })
    ]);

    // Calcular porcentajes de cambio
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Calcular porcentaje de asistencia promedio
    const totalExpectedToday = await prisma.eventRegistration.count({
      where: {
        event: {
          organizerId,
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart }
        },
        status: { in: ['registered', 'attended'] }
      }
    });

    const attendanceRate = totalExpectedToday > 0 
      ? Math.round((todayAttendance / totalExpectedToday) * 100) 
      : 0;

    const stats = {
      events: {
        total: totalEvents,
        active: activeEvents,
        upcoming: upcomingEvents,
        completed: completedEvents,
        trend: calculateTrend(thisMonthEvents, lastMonthEvents)
      },
      registrations: {
        total: totalRegistrations,
        today: todayRegistrations,
        trend: calculateTrend(thisMonthRegistrations, lastMonthRegistrations)
      },
      attendance: {
        today: todayAttendance,
        rate: attendanceRate,
        expected: totalExpectedToday
      },
      certificates: {
        total: totalCertificates,
        today: todayCertificates
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting organizer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/dashboard/organizer/upcoming-events
 * Obtener próximos eventos del organizador
 */
export const getOrganizerUpcomingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = req.user!.userId;
    const userRole = req.user!.role;
    const { limit = 5 } = req.query;

    // Verificar permisos
    if (userRole !== 1 && userRole !== 3) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a esta información'
      });
      return;
    }

    const today = new Date();
    
    const upcomingEvents = await prisma.event.findMany({
      where: {
        organizerId,
        isActive: true,
        startDate: { gte: today }
      },
      include: {
        category: {
          select: { id: true, name: true, color: true }
        },
        _count: {
          select: {
            registrations: { where: { status: 'registered' } }
          }
        }
      },
      orderBy: { startDate: 'asc' },
      take: Number(limit)
    });

    const eventsWithStatus = upcomingEvents.map(event => {
      const now = new Date();
      const hoursUntil = Math.ceil((event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      let status = 'upcoming';
      if (hoursUntil <= 24) status = 'soon';
      if (hoursUntil <= 2) status = 'very-soon';

      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        startTime: event.startTime,
        location: event.location,
        category: event.category,
        registrations: event._count.registrations,
        maxCapacity: event.maxCapacity,
        availableSlots: event.maxCapacity - event._count.registrations,
        hoursUntil,
        status
      };
    });

    res.json({
      success: true,
      data: eventsWithStatus
    });
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/dashboard/organizer/notifications
 * Obtener notificaciones del organizador
 */
export const getOrganizerNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = req.user!.userId;
    const userRole = req.user!.role;
    const { limit = 10, unreadOnly = false } = req.query;

    // Verificar permisos
    if (userRole !== 1 && userRole !== 3) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a estas notificaciones'
      });
      return;
    }

    const where: any = { userId: organizerId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),
      
      prisma.notification.count({
        where: { userId: organizerId, isRead: false }
      })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/dashboard/organizer/notifications/:id/read
 * Marcar notificación como leída
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await prisma.notification.update({
      where: {
        id: Number(id),
        userId // Asegurar que solo el usuario puede marcar sus notificaciones
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/dashboard/organizer/recent-activity
 * Obtener actividad reciente del organizador
 */
export const getOrganizerRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = req.user!.userId;
    const userRole = req.user!.role;
    const { limit = 10 } = req.query;

    // Verificar permisos
    if (userRole !== 1 && userRole !== 3) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a esta información'
      });
      return;
    }

    const activities = await prisma.userActivity.findMany({
      where: { userId: organizerId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};