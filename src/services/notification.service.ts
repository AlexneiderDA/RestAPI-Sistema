// src/services/notification.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  /**
   * Crear una notificación para un usuario
   */
  static async createNotification(
    userId: number,
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: number
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          relatedEntityType,
          relatedEntityId
        }
      });

      // Aquí podrías agregar lógica para push notifications en tiempo real
      // usando WebSockets, Firebase, etc.

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Crear notificaciones masivas
   */
  static async createBulkNotifications(
    userIds: number[],
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: number
  ) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId
      }));

      await prisma.notification.createMany({
        data: notifications
      });

      return notifications.length;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number, userId: number) {
    try {
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId // Asegurar que solo el usuario puede marcar sus notificaciones
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async getUserNotifications(userId: number, page = 1, limit = 20, unreadOnly = false) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { userId };
      
      if (unreadOnly) {
        where.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.notification.count({ where })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Notificaciones específicas para eventos
   */
  static async sendEventRegistrationNotification(userId: number, eventTitle: string, eventId: number) {
    return this.createNotification(
      userId,
      'event',
      'Registro confirmado',
      `Te has registrado exitosamente al evento "${eventTitle}"`,
      'event',
      eventId
    );
  }

  static async sendEventReminderNotification(userId: number, eventTitle: string, eventId: number, hoursUntil: number) {
    const message = hoursUntil <= 24 
      ? `El evento "${eventTitle}" comienza en ${hoursUntil} horas`
      : `El evento "${eventTitle}" comienza en ${Math.ceil(hoursUntil / 24)} días`;

    return this.createNotification(
      userId,
      'reminder',
      'Recordatorio de evento',
      message,
      'event',
      eventId
    );
  }

  static async sendCertificateAvailableNotification(userId: number, eventTitle: string, certificateId: number) {
    return this.createNotification(
      userId,
      'certificate',
      'Constancia disponible',
      `Tu constancia del evento "${eventTitle}" ya está disponible para descarga`,
      'certificate',
      certificateId
    );
  }
}
