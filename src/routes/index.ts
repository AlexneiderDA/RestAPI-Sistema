// src/routes/index.ts
import { Router } from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import eventRouter from './event.router.js';
import registrationRouter from './registration.router.js';
import categoryRouter from './category.router.js';
import dashboardRouter from './dashboard.router.js';
import userProfileRouter from './user-profile.router.js';

const router = Router();

// ===== RUTAS PÚBLICAS =====
// Rutas de autenticación (públicas)
router.use('/auth', authRouter);

// Rutas de eventos (públicas para GET, protegidas para POST/PUT/DELETE)
router.use('/events', eventRouter);

router.use('/', categoryRouter);


// ===== RUTAS PROTEGIDAS =====
// Rutas de usuarios (requieren autenticación)
router.use('/', userRouter);

// Rutas de registros (requieren autenticación)
router.use('/', registrationRouter);

router.use('/user-profile', userProfileRouter);

router.use('/dashboard', dashboardRouter);

// Rutas que implementarás después:
// router.use('/categories', categoryRouter);
// router.use('/certificates', certificateRouter);
// router.use('/notifications', notificationRouter);

// Health check para la API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      cache: 'not_implemented',
      email: 'configured'
    }
  });
});

// Ruta de información de la API
router.get('/info', (req, res) => {
  res.json({
    success: true,
    api: {
      name: 'Sistema de Eventos y Constancias API',
      version: '1.0.0',
      description: 'API REST para gestión de eventos académicos y generación de constancias',
      endpoints: {
        'GET /': 'Obtener perfil completo del usuario autenticado',
        'GET /dashboard': 'Obtener datos del dashboard personalizado',
        'PUT /personal-data': 'Actualizar datos personales del perfil',
        'PUT /password': 'Cambiar contraseña del usuario',
        'PUT /email': 'Cambiar email del usuario',
        'PUT /notifications': 'Actualizar preferencias de notificaciones',
        'PUT /image': 'Actualizar imagen de perfil',
        'DELETE /image': 'Eliminar imagen de perfil',
        'GET /activity': 'Obtener historial de actividades del usuario',
        'DELETE /': 'Desactivar cuenta de usuario',
        'GET /users/:id (admin)': 'Obtener perfil de cualquier usuario',
        'GET /users/:id/activity (admin)': 'Obtener actividades de cualquier usuario',
        'POST /users/:id/reset-password (admin)': 'Resetear contraseña de usuario',
        'POST /users/:id/toggle-status (admin)': 'Activar/desactivar usuario'
      }
    }
  });
});

export default router;