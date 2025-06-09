// src/index.ts - Sección de CORS actualizada
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.'
  }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Demasiados intentos de autenticación, intenta nuevamente más tarde.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ⭐ CONFIGURACIÓN CORS SÚPER PERMISIVA PARA DESARROLLO ⭐
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    console.log('🔍 CORS - Origin recibido:', origin);
    
    // En desarrollo, ser MUY permisivo
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      // Permitir requests sin origin (móviles, Postman, etc.)
      if (!origin) {
        console.log('✅ CORS - Permitiendo request sin origin');
        return callback(null, true);
      }
      
      // Permitir CUALQUIER puerto de localhost o 127.0.0.1
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('✅ CORS - Permitiendo localhost:', origin);
        return callback(null, true);
      }
      
      // También permitir file:// para desarrollo local
      if (origin.startsWith('file://')) {
        console.log('✅ CORS - Permitiendo file protocol:', origin);
        return callback(null, true);
      }
    }
    
    // Lista de dominios permitidos para producción
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://yourdomain.com'
    ];
    
    if (allowedOrigins.indexOf(origin!) !== -1) {
      console.log('✅ CORS - Origen autorizado:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS - Origen rechazado:', origin);
      callback(new Error('No permitido por CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200 // Para IE11
};

app.use(cors(corsOptions));

// Middleware adicional para debugging CORS
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Preflight requests explícito
app.options('*', cors(corsOptions));

// Ruta de health check
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

// Resto de la configuración... (middleware de errores, etc.)
// (mantén el resto de tu archivo igual)

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 CORS habilitado para desarrollo: cualquier localhost`);
  console.log(`📅 Iniciado: ${new Date().toISOString()}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
  
  // URLs de prueba
  console.log(`\n📋 URLs de prueba:`);
  console.log(`   http://localhost:${PORT}/api/health`);
  console.log(`   http://localhost:${PORT}/api/auth/register`);
  console.log(`   http://localhost:${PORT}/api/events`);
});

export default app;