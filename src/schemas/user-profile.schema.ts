// src/schemas/user-profile.schema.ts
import { z } from 'zod';

// Schema para datos personales
export const updatePersonalDataSchema = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .optional(),
  
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .optional(),
  
  phone: z.string()
    .regex(/^(\+52)?[0-9]{10}$/, 'Formato de teléfono inválido (10 dígitos)')
    .optional(),
  
  institution: z.string()
    .min(2, 'La institución debe tener al menos 2 caracteres')
    .max(100, 'La institución no puede exceder 100 caracteres')
    .optional(),
  
  occupation: z.string()
    .max(100, 'La ocupación no puede exceder 100 caracteres')
    .optional(),
  
  biography: z.string()
    .max(500, 'La biografía no puede exceder 500 caracteres')
    .optional(),
  
  dateOfBirth: z.string()
    .datetime('Fecha de nacimiento inválida')
    .optional()
    .refine(date => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, 'Edad debe estar entre 13 y 120 años'),
  
  country: z.string()
    .max(50, 'El país no puede exceder 50 caracteres')
    .optional(),
  
  city: z.string()
    .max(50, 'La ciudad no puede exceder 50 caracteres')
    .optional(),
  
  socialLinks: z.object({
    linkedin: z.string()
      .url('URL de LinkedIn inválida')
      .refine(url => url.includes('linkedin.com'), 'Debe ser una URL de LinkedIn válida')
      .optional(),
    twitter: z.string()
      .url('URL de Twitter inválida')
      .refine(url => url.includes('twitter.com') || url.includes('x.com'), 'Debe ser una URL de Twitter/X válida')
      .optional(),
    github: z.string()
      .url('URL de GitHub inválida')
      .refine(url => url.includes('github.com'), 'Debe ser una URL de GitHub válida')
      .optional(),
    website: z.string()
      .url('URL de sitio web inválida')
      .optional()
  }).optional()
});

// Schema para cambio de contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'La contraseña actual es requerida'),
  
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'
    ),
  
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Schema para cambio de email
export const changeEmailSchema = z.object({
  newEmail: z.string()
    .email('Correo electrónico inválido')
    .max(254, 'El email no puede exceder 254 caracteres'),
  
  currentPassword: z.string()
    .min(1, 'La contraseña es requerida para confirmar el cambio')
});

// Schema para preferencias de notificaciones
export const notificationPreferencesSchema = z.object({
  emailNewEvents: z.boolean().default(true),
  emailEventReminders: z.boolean().default(true),
  emailCertificatesAvailable: z.boolean().default(true),
  emailNewsletter: z.boolean().default(false),
  platformNewEvents: z.boolean().default(true),
  platformEventReminders: z.boolean().default(true),
  platformCertificatesAvailable: z.boolean().default(true),
  platformUpdates: z.boolean().default(false)
});

// Schema para subida de imagen de perfil
export const profileImageSchema = z.object({
  imageUrl: z.string()
    .url('URL de imagen inválida')
    .refine(url => {
      // Validar que sea una URL de imagen válida
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const urlLower = url.toLowerCase();
      return imageExtensions.some(ext => urlLower.includes(ext)) || 
             url.includes('cloudinary.com') || 
             url.includes('amazonaws.com') ||
             url.includes('googleapis.com');
    }, 'Debe ser una URL de imagen válida')
});

// Schema para query parameters de actividades
export const activityQuerySchema = z.object({
  page: z.string()
    .transform(val => parseInt(val) || 1)
    .refine(val => val > 0, 'La página debe ser mayor a 0')
    .optional(),
  
  limit: z.string()
    .transform(val => {
      const num = parseInt(val) || 20;
      return Math.min(Math.max(num, 1), 100); // Entre 1 y 100
    })
    .optional(),
  
  activityType: z.string()
    .max(50)
    .optional()
});

// Schema para desactivación de cuenta
export const deactivateAccountSchema = z.object({
  currentPassword: z.string()
    .min(1, 'La contraseña es requerida'),
  
  reason: z.string()
    .max(500, 'La razón no puede exceder 500 caracteres')
    .optional(),
  
  confirmation: z.literal('DEACTIVATE', {
    errorMap: () => ({ message: 'Debes escribir "DEACTIVATE" para confirmar' })
  })
});

// Schema para actualización básica de usuario (admin)
export const updateBasicUserSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  
  email: z.string()
    .email('Correo electrónico inválido')
    .max(254, 'El email no puede exceder 254 caracteres')
    .optional(),
  
  rolId: z.number()
    .int('El ID del rol debe ser un número entero')
    .min(1, 'ID de rol inválido')
    .optional()
});

// Schema para validar parámetros de usuario
export const userIdParamSchema = z.object({
  id: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, 'ID de usuario inválido')
});

// Tipos inferidos
export type UpdatePersonalDataInput = z.infer<typeof updatePersonalDataSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type ProfileImageInput = z.infer<typeof profileImageSchema>;
export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;
export type UpdateBasicUserInput = z.infer<typeof updateBasicUserSchema>;
export type UserIdParams = z.infer<typeof userIdParamSchema>;

// Funciones helper para validaciones adicionales
export const validateAge = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 13 && age - 1 <= 120;
  }
  
  return age >= 13 && age <= 120;
};

export const validateSocialLinks = (links: any): boolean => {
  if (!links || typeof links !== 'object') return true;
  
  const validDomains = {
    linkedin: ['linkedin.com'],
    twitter: ['twitter.com', 'x.com'],
    github: ['github.com'],
    website: [] // Cualquier dominio válido para website
  };
  
  for (const [platform, url] of Object.entries(links)) {
    if (typeof url === 'string' && url.length > 0) {
      try {
        const urlObj = new URL(url);
        const domains = validDomains[platform as keyof typeof validDomains];
        
        if (domains && domains.length > 0) {
          if (!domains.some(domain => urlObj.hostname.includes(domain))) {
            return false;
          }
        }
      } catch {
        return false;
      }
    }
  }
  
  return true;
};