// src/index-with-routers.ts - Para testing con routers
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Initializing server...');

// Configuración CORS
const corsOptions = {
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

console.log('Middleware configured');

// Ruta básica
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Server is OK',
    timestamp: new Date().toISOString()
  });
});

console.log('Basic routes configured');

// Importar y usar routers simplificados
try {
  console.log('Importing auth router...');
  const authRouter = await import('./routes/auth.router-simple.js');
  app.use('/api/auth', authRouter.default);
  console.log('Auth router mounted successfully');

  console.log('Importing user router...');
  const userRouter = await import('./routes/user.router-simple.js');
  app.use('/api', userRouter.default);
  console.log('User router mounted successfully');
} catch (error) {
  console.error('Error importing routers:', error);
  process.exit(1);
}

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

console.log('Starting server...');

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 CORS enabled for: http://localhost:3001`);
});

export default app;