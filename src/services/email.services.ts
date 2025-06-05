// src/services/email.services.ts
interface EventConfirmationData {
  userName: string;
  eventTitle: string;
  eventDate: Date;
  eventTime: string;
  eventLocation: string;
  qrCode: string | null; // Permitir null
  sessions?: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
  }>;
}

interface CertificateNotificationData {
  userName: string;
  eventTitle: string;
  certificateUrl: string;
  verificationCode: string;
}

export class EmailService {
  /**
   * Enviar email de confirmación de registro
   */
  static async sendEventConfirmation(userEmail: string, data: EventConfirmationData) {
    try {
      console.log(`📧 Enviando confirmación de registro a: ${userEmail}`);
      
      // Aquí implementarías el envío real usando:
      // - Nodemailer con SMTP
      // - SendGrid
      // - Amazon SES
      // - Etc.
      
      const emailTemplate = this.generateEventConfirmationTemplate(data);
      
      // Ejemplo con console.log (reemplazar con servicio real)
      console.log('📧 Email Template:', emailTemplate);
      
      // Simular envío exitoso
      return {
        success: true,
        messageId: `msg_${Date.now()}`,
        recipient: userEmail
      };
    } catch (error) {
      console.error('Error sending event confirmation email:', error);
      throw error;
    }
  }

  /**
   * Enviar recordatorio de evento
   */
  static async sendEventReminder(userEmail: string, userName: string, eventTitle: string, eventDate: Date, hoursUntil: number) {
    try {
      console.log(`📧 Enviando recordatorio de evento a: ${userEmail}`);
      
      const emailTemplate = this.generateEventReminderTemplate({
        userName,
        eventTitle,
        eventDate,
        hoursUntil
      });
      
      console.log('📧 Reminder Template:', emailTemplate);
      
      return {
        success: true,
        messageId: `reminder_${Date.now()}`,
        recipient: userEmail
      };
    } catch (error) {
      console.error('Error sending event reminder:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de constancia disponible
   */
  static async sendCertificateNotification(userEmail: string, data: CertificateNotificationData) {
    try {
      console.log(`📧 Enviando notificación de constancia a: ${userEmail}`);
      
      const emailTemplate = this.generateCertificateNotificationTemplate(data);
      
      console.log('📧 Certificate Template:', emailTemplate);
      
      return {
        success: true,
        messageId: `cert_${Date.now()}`,
        recipient: userEmail
      };
    } catch (error) {
      console.error('Error sending certificate notification:', error);
      throw error;
    }
  }

  /**
   * Generar template de confirmación de evento
   */
  private static generateEventConfirmationTemplate(data: EventConfirmationData): string {
    const sessionsList = data.sessions?.map(session => 
      `• ${session.title} (${session.startTime} - ${session.endTime})`
    ).join('\n') || '';

    // Manejar el caso cuando qrCode puede ser null
    const qrSection = data.qrCode 
      ? `📱 Código QR para asistencia: ${data.qrCode}\n\nPor favor, presenta este código QR al momento de registrar tu asistencia al evento.`
      : `📱 Tu código QR de asistencia será generado próximamente y te será enviado por separado.`;

    return `
      Estimado/a ${data.userName},

      ¡Confirmamos tu registro al evento "${data.eventTitle}"!

      📅 Fecha: ${data.eventDate.toLocaleDateString('es-MX')}
      🕐 Hora: ${data.eventTime}
      📍 Ubicación: ${data.eventLocation}

      ${sessionsList ? `🎯 Sesiones registradas:\n${sessionsList}\n` : ''}

      ${qrSection}

      ¡Te esperamos!
      
      Equipo DACYTI
    `;
  }

  /**
   * Generar template de recordatorio
   */
  private static generateEventReminderTemplate(data: any): string {
    const timeText = data.hoursUntil <= 24 
      ? `${data.hoursUntil} horas`
      : `${Math.ceil(data.hoursUntil / 24)} días`;

    return `
      Estimado/a ${data.userName},

      Este es un recordatorio de que el evento "${data.eventTitle}" comienza en ${timeText}.

      📅 Fecha: ${data.eventDate.toLocaleDateString('es-MX')}
      
      ¡No olvides asistir!
      
      Equipo DACYTI
    `;
  }

  /**
   * Generar template de constancia disponible
   */
  private static generateCertificateNotificationTemplate(data: CertificateNotificationData): string {
    return `
      Estimado/a ${data.userName},

      Tu constancia del evento "${data.eventTitle}" ya está disponible para descarga.

      🔗 Enlace de descarga: ${data.certificateUrl}
      🔐 Código de verificación: ${data.verificationCode}

      Puedes descargar tu constancia en formato PDF desde el enlace anterior.

      ¡Gracias por tu participación!
      
      Equipo DACYTI
    `;
  }
}