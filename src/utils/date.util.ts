// src/utils/date.util.ts
/**
 * Utilidades para manejo de fechas
 */
export class DateUtil {
  /**
   * Verificar si una fecha está en el futuro
   */
  static isFuture(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Verificar si una fecha está en el pasado
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Obtener diferencia en horas entre dos fechas
   */
  static getHoursDifference(date1: Date, date2: Date): number {
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Formatear fecha para mostrar
   */
  static formatDate(date: Date, locale = 'es-MX'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatear hora para mostrar
   */
  static formatTime(time: string): string {
    return time; // Ya viene en formato HH:MM
  }

  /**
   * Verificar si un evento está en curso
   */
  static isEventOngoing(startDate: Date, endDate: Date): boolean {
    const now = new Date();
    return now >= startDate && now <= endDate;
  }

  /**
   * Obtener estado de un evento basado en fechas
   */
  static getEventStatus(startDate: Date, endDate: Date): 'upcoming' | 'ongoing' | 'finished' {
    const now = new Date();
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'ongoing';
    return 'finished';
  }
}