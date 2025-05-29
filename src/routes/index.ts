// src/routes/index.ts
import { Router } from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import eventRouter from './event.router.js';
import registrationRouter from './registration.router.js';
// import categoryRouter from './category.router.js';
// import certificateRouter from './certificate.router.js';
// import notificationRouter from './notification.router.js';

const router = Router();

// Rutas de autenticación
router.use('/auth', authRouter);

// Rutas de usuarios
router.use('/', userRouter);

// Rutas de eventos
router.use('/events', eventRouter);

// Rutas de registros
router.use('/', registrationRouter);

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
      database: 'connected', // Aquí podrías verificar la conexión real
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
        auth: '/api/auth',
        events: '/api/events',
        registrations: '/api/registrations',
        users: '/api/users'
      }
    }
  });
});

export default router;