// src/services/activity.service.ts
/**
 * Servicio para registrar actividades de usuario
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export class ActivityService {
  static async logActivity(
    userId: number,
    activityType: string,
    description: string,
    relatedEntityType?: string,
    relatedEntityId?: number,
    metadata?: any,
    req?: any
  ) {
    try {
      const activity = await prisma.userActivity.create({
        data: {
          userId,
          activityType,
          description,
          relatedEntityType,
          relatedEntityId,
          metadata,
          ipAddress: req?.ip || null,
          userAgent: req?.get('User-Agent') || null
        }
      });

      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  static async getUserActivities(userId: number, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [activities, total] = await Promise.all([
        prisma.userActivity.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.userActivity.count({ where: { userId } })
      ]);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  }
}