// src/index.ts (Backend)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.router.js';
import authRouter from './routes/auth.router.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS más específica
const corsOptions = {
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'], // URLs del frontend
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear cookies
app.use(cookieParser());

// Middleware para manejar preflight requests
app.options('*', cors(corsOptions));

// Ruta de health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Server is OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/auth', authRouter);
app.use('/api', userRouter);

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware para manejar errores globales
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error global:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 CORS enabled for: http://localhost:3001`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});