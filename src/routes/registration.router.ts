// src/routes/registration.router.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  registerToEvent,
  cancelRegistration,
  getUserRegistrations,
  getRegistrationById,
  checkInRegistration,
  checkOutRegistration
} from '../controllers/registration.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest, validateQuery, validateParams, validateBody } from '../middleware/validate.middleware.js';
import {
  registerToEventSchema,
  cancelRegistrationSchema,
  registrationQuerySchema,
  attendanceSchema,
  registrationIdSchema
} from '../schemas/registration.schema.js';
import { eventIdSchema } from '../schemas/event.schema.js';

const router = Router();
const prisma = new PrismaClient();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ===== REGISTRO A EVENTOS =====

/**
 * POST /api/events/:id/register
 * Registrarse a un evento específico
 */
router.post('/events/:id/register',
  validateParams(eventIdSchema),
  validateBody(registerToEventSchema),
  registerToEvent
);

// ===== GESTIÓN DE REGISTROS =====

/**
 * GET /api/users/:id/registrations
 * Obtener registros de un usuario
 */
router.get('/users/:id/registrations',
  validateQuery(registrationQuerySchema),
  getUserRegistrations
);

/**
 * GET /api/registrations/:id
 * Obtener detalles de un registro específico
 */
router.get('/registrations/:id',
  validateParams(registrationIdSchema),
  getRegistrationById
);

/**
 * DELETE /api/registrations/:id
 * Cancelar un registro
 */
router.delete('/registrations/:id',
  validateParams(registrationIdSchema),
  validateBody(cancelRegistrationSchema),
  cancelRegistration
);

// ===== CONTROL DE ASISTENCIA (Solo organizadores y admin) =====

/**
 * POST /api/registrations/:id/check-in
 * Marcar entrada al evento
 */
router.post('/registrations/:id/check-in',
  validateParams(registrationIdSchema),
  validateBody(attendanceSchema),
  authorize([1, 3]), // admin y organizador
  checkInRegistration
);

/**
 * POST /api/registrations/:id/check-out
 * Marcar salida del evento
 */
router.post('/registrations/:id/check-out',
  validateParams(registrationIdSchema),
  validateBody(attendanceSchema),
  authorize([1, 3]), // admin y organizador
  checkOutRegistration
);

// ===== RUTAS ADICIONALES DE GESTIÓN =====

/**
 * GET /api/events/:id/registrations
 * Obtener todos los registros de un evento (para organizadores)
 */
router.get('/events/:id/registrations',
  validateParams(eventIdSchema),
  validateQuery(registrationQuerySchema),
  authorize([1, 3]),
  async (req, res) => {
    try {
      const { id: eventId } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, page = 1, limit = 50 } = req.query;

      // Verificar que el evento existe
      const event = await prisma.event.findUnique({
        where: { id: Number(eventId) }
      });

      if (!event) {
        res.status(404).json({ 
          success: false,
          error: 'Evento no encontrado' 
        });
        return;
      }

      // Verificar permisos
      if (userRole !== 1 && event.organizerId !== userId) {
        res.status(403).json({ 
          success: false,
          error: 'No tienes permisos para ver estos registros' 
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { eventId: Number(eventId) };
      if (status) where.status = status;

      const [registrations, total] = await Promise.all([
        prisma.eventRegistration.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            sessionRegistrations: {
              include: {
                session: {
                  select: {
                    id: true,
                    title: true
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

      res.json({
        success: true,
        data: {
          registrations,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          },
          statistics: {
            total: total,
            registered: await prisma.eventRegistration.count({
              where: { eventId: Number(eventId), status: 'registered' }
            }),
            attended: await prisma.eventRegistration.count({
              where: { eventId: Number(eventId), status: 'attended' }
            }),
            cancelled: await prisma.eventRegistration.count({
              where: { eventId: Number(eventId), status: 'cancelled' }
            })
          }
        }
      });
    } catch (error) {
      console.error('Error fetching event registrations:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }
);

/**
 * POST /api/events/:id/registrations/export
 * Exportar lista de registrados a CSV/Excel
 */
router.post('/events/:id/registrations/export',
  validateParams(eventIdSchema),
  authorize([1, 3]),
  async (req, res) => {
    try {
      const { id: eventId } = req.params;
      const { format = 'csv' } = req.body;

      // Implementar lógica de exportación
      res.json({
        success: true,
        message: `Exportación en formato ${format} - Por implementar`,
        data: {
          downloadUrl: `https://api.example.com/downloads/event-${eventId}-registrations.${format}`
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }
);

/**
 * POST /api/registrations/bulk-check-in
 * Check-in masivo con QR scanner
 */
router.post('/registrations/bulk-check-in',
  authorize([1, 3]),
  async (req, res) => {
    try {
      const { qrCodes } = req.body;

      if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Debe proporcionar al menos un código QR'
        });
        return;
      }

      const results = [];
      
      for (const qrCode of qrCodes) {
        try {
          const registration = await prisma.eventRegistration.findFirst({
            where: { qrCode },
            include: {
              user: { select: { name: true } },
              event: { select: { title: true } }
            }
          });

          if (!registration) {
            results.push({
              qrCode,
              success: false,
              error: 'Registro no encontrado'
            });
            continue;
          }

          if (registration.attendanceCheckedIn) {
            results.push({
              qrCode,
              success: false,
              error: 'Ya marcó entrada',
              data: {
                userName: registration.user.name,
                checkedInAt: registration.attendanceCheckedIn
              }
            });
            continue;
          }

          await prisma.eventRegistration.update({
            where: { id: registration.id },
            data: {
              attendanceCheckedIn: new Date(),
              status: 'attended'
            }
          });

          results.push({
            qrCode,
            success: true,
            data: {
              userName: registration.user.name,
              eventTitle: registration.event.title,
              checkedInAt: new Date()
            }
          });
        } catch (error) {
          results.push({
            qrCode,
            success: false,
            error: 'Error procesando código QR'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        message: `Procesados ${results.length} códigos QR, ${successCount} exitosos`,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount
          }
        }
      });
    } catch (error) {
      console.error('Error in bulk check-in:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

export default router;