import { z } from 'zod';

// Esquema para validar el login
export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

// Esquema para validar el registro
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
      'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'
    ),
  passwordConfirm: z.string()
}).refine(data => data.password === data.passwordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirm"],
});

// Tipos inferidos de los esquemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;