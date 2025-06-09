// src/routes/index.ts
import { Router } from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import eventRouter from './event.router.js';
import registrationRouter from './registration.router.js';
import categoryRouter from './category.router.js';
import dashboardRouter from './dashboard.router.js';

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
        public: {
          events: 'GET /api/events',
          featured: 'GET /api/events/featured',
          eventDetails: 'GET /api/events/:id',
          health: 'GET /api/health'
        },
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          logout: 'POST /api/auth/logout'
        },
        protected: {
          createEvent: 'POST /api/events (auth required)',
          registerToEvent: 'POST /api/events/:id/register (auth required)',
          userProfile: 'GET /api/users/:id (auth required)'
        }
      }
    }
  });
});

export default router;