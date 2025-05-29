// src/index.ts (actualizado)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import apiRoutes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.'
  }
});
app.use('/api/', limiter);

// Rate limiting más estricto para rutas de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP
  message: {
    error: 'Demasiados intentos de autenticación, intenta nuevamente más tarde.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Configuración CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Lista de dominios permitidos
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://yourdomain.com' // Agregar dominio de producción
    ];
    
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Middleware para parsear JSON con límite de tamaño
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para cookies
app.use(cookieParser());

// Middleware para logs de requests (en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Preflight requests
app.options('*', cors(corsOptions));

// Ruta de health check básica
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Sistema de Eventos y Constancias API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/api', apiRoutes);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: {
      auth: 'POST /api/auth/login, POST /api/auth/register',
      events: 'GET /api/events, POST /api/events',
      registrations: 'POST /api/events/:id/register'
    }
  });
});

// Middleware para manejo de errores globales
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error global capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Error de validación de Zod
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }

  // Error de CORS
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado por política CORS'
    });
  }

  // Error de rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes, intenta más tarde'
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error
    })
  });
});

// Manejar shutdown graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 CORS habilitado para desarrollo`);
  console.log(`📅 Iniciado: ${new Date().toISOString()}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n📋 Rutas disponibles:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   GET  http://localhost:${PORT}/api/events`);
    console.log(`   GET  http://localhost:${PORT}/api/events/featured`);
    console.log(`   POST http://localhost:${PORT}/api/events (auth required)`);
    console.log(`   POST http://localhost:${PORT}/api/events/:id/register (auth required)`);
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   GET  http://localhost:${PORT}/api/info\n`);
  }
});

export default app;