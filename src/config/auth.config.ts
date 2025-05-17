export const AUTH_CONFIG = {
  // Secretos para JWT (deberían estar en variables de entorno en producción)
  jwtSecret: process.env.JWT_SECRET || 'tu_clave_secreta_jwt',
  jwtExpiresIn: '1h', // Token expira en 1 hora
  refreshTokenExpiresIn: '7d', // Refresh token expira en 7 días
  
  // Configuración bcrypt
  saltRounds: 10, // Número de rondas de salt para bcrypt
  
  // Configuración de cookies
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
  }
};