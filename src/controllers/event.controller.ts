// src/controllers/event.controller.ts
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { CreateEventInput, UpdateEventInput } from '../schemas/event.schema.js';

const prisma = new PrismaClient();

/**
 * GET /api/events
 * Obtener todos los eventos con paginación y filtros
 */
export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      featured,
      startDate,
      endDate,
      status = 'active'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Construir filtros dinámicos
    const where: any = {};
    
    if (status === 'active') {
      where.isActive = true;
      where.startDate = { gte: new Date() }; // Solo eventos futuros
    }
    
    if (category) where.categoryId = Number(category);
    if (featured === 'true') where.isFeatured = true;
    
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { tags: { has: String(search) } }
      ];
    }
    
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, color: true }
          },
          organizer: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { 
              registrations: { where: { status: 'registered' } }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: [
          { isFeatured: 'desc' },
          { startDate: 'asc' }
        ]
      }),
      prisma.event.count({ where })
    ]);

    // Calcular cupos disponibles
    const eventsWithAvailability = events.map(event => ({
      ...event,
      availableSlots: event.maxCapacity - event._count.registrations,
      registrationStatus: event.maxCapacity <= event._count.registrations ? 'full' : 'available'
    }));

    res.json({
      success: true,
      data: {
        events: eventsWithAvailability,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * GET /api/events/:id
 * Obtener evento específico con detalles completos
 */
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId; // Usuario autenticado (opcional)

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        organizer: {
          select: { id: true, name: true, email: true }
        },
        schedule: {
          orderBy: { order: 'asc' }
        },
        sessions: {
          where: { isActive: true },
          orderBy: { startTime: 'asc' }
        },
        _count: {
          select: { 
            registrations: { where: { status: 'registered' } }
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado' 
      });
      return;
    }

    // Verificar si el usuario está registrado (si está autenticado)
    let userRegistration = null;
    if (userId) {
      userRegistration = await prisma.eventRegistration.findUnique({
        where: { 
          userId_eventId: { userId, eventId: Number(id) }
        },
        include: {
          sessionRegistrations: {
            include: { session: true }
          }
        }
      });
    }

    const eventWithDetails = {
      ...event,
      availableSlots: event.maxCapacity - event._count.registrations,
      registrationStatus: event.maxCapacity <= event._count.registrations ? 'full' : 'available',
      userRegistration: userRegistration ? {
        id: userRegistration.id,
        status: userRegistration.status,
        registrationDate: userRegistration.registrationDate,
        qrCode: userRegistration.qrCode,
        sessions: userRegistration.sessionRegistrations.map(sr => sr.session)
      } : null
    };

    res.json({
      success: true,
      data: eventWithDetails
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * POST /api/events
 * Crear nuevo evento (solo organizadores/admin)
 */
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventData: CreateEventInput = req.body;
    const organizerId = req.user!.userId;

    // Validaciones adicionales de negocio
    const startDate = new Date(eventData.startDate);
    const endDate = new Date(eventData.endDate);
    
    if (startDate < new Date()) {
      res.status(400).json({ 
        success: false,
        error: 'La fecha de inicio no puede ser en el pasado' 
      });
      return;
    }

    if (endDate <= startDate) {
      res.status(400).json({ 
        success: false,
        error: 'La fecha de fin debe ser posterior a la fecha de inicio' 
      });
      return;
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: eventData.categoryId }
    });

    if (!category) {
      res.status(400).json({ 
        success: false,
        error: 'Categoría no válida' 
      });
      return;
    }

    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description,
        shortDescription: eventData.shortDescription,
        imageUrl: eventData.imageUrl,
        startDate,
        endDate,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location,
        address: eventData.address,
        categoryId: eventData.categoryId,
        maxCapacity: eventData.maxCapacity,
        requiresCertificate: eventData.requiresCertificate || false,
        isFeatured: eventData.isFeatured || false,
        requirements: eventData.requirements || [],
        tags: eventData.tags || [],
        organizerId
      },
      include: {
        category: true,
        organizer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log de actividad
    await prisma.userActivity.create({
      data: {
        userId: organizerId,
        activityType: 'event_created',
        description: `Creó el evento "${event.title}"`,
        relatedEntityType: 'event',
        relatedEntityId: event.id,
        metadata: { eventTitle: event.title }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * PUT /api/events/:id
 * Actualizar evento existente
 */
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const eventData: UpdateEventInput = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Verificar que el evento existe
    const existingEvent = await prisma.event.findUnique({
      where: { id: Number(id) }
    });

    if (!existingEvent) {
      res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado' 
      });
      return;
    }

    // Verificar permisos (solo el organizador o admin)
    if (userRole !== 1 && existingEvent.organizerId !== userId) {
      res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para actualizar este evento' 
      });
      return;
    }

    // Validaciones si hay registrados
    const registrationCount = await prisma.eventRegistration.count({
      where: { eventId: Number(id), status: 'registered' }
    });

    if (registrationCount > 0 && eventData.maxCapacity && eventData.maxCapacity < registrationCount) {
      res.status(400).json({ 
        success: false,
        error: `No puedes reducir la capacidad por debajo de ${registrationCount} (registrados actuales)` 
      });
      return;
    }

    // Construir datos de actualización
    const updateData: any = { ...eventData };
    
    if (eventData.startDate) updateData.startDate = new Date(eventData.startDate);
    if (eventData.endDate) updateData.endDate = new Date(eventData.endDate);

    const updatedEvent = await prisma.event.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        category: true,
        organizer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log de actividad
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: 'event_updated',
        description: `Actualizó el evento "${updatedEvent.title}"`,
        relatedEntityType: 'event',
        relatedEntityId: updatedEvent.id
      }
    });

    res.json({
      success: true,
      message: 'Evento actualizado exitosamente',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * DELETE /api/events/:id
 * Eliminar evento (soft delete)
 */
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { registrations: { where: { status: 'registered' } } }
        }
      }
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
        error: 'No tienes permisos para eliminar este evento' 
      });
      return;
    }

    // No permitir eliminación si hay registrados
    if (event._count.registrations > 0) {
      res.status(400).json({ 
        success: false,
        error: 'No se puede eliminar un evento con participantes registrados' 
      });
      return;
    }

    // Soft delete
    await prisma.event.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });

    // Log de actividad
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: 'event_deleted',
        description: `Eliminó el evento "${event.title}"`,
        relatedEntityType: 'event',
        relatedEntityId: event.id
      }
    });

    res.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * GET /api/events/featured
 * Obtener eventos destacados para el carrusel
 */
export const getFeaturedEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        startDate: { gte: new Date() }
      },
      include: {
        category: {
          select: { id: true, name: true, color: true }
        },
        _count: {
          select: { registrations: { where: { status: 'registered' } } }
        }
      },
      take: 5,
      orderBy: { startDate: 'asc' }
    });

    const featuredEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      shortDescription: event.shortDescription,
      imageUrl: event.imageUrl,
      startDate: event.startDate,
      startTime: event.startTime,
      location: event.location,
      category: event.category,
      availableSlots: event.maxCapacity - event._count.registrations,
      registrationStatus: event.maxCapacity <= event._count.registrations ? 'full' : 'available'
    }));

    res.json({
      success: true,
      data: featuredEvents
    });
  } catch (error) {
    console.error('Error fetching featured events:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};