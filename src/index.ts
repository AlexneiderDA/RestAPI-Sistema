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

app.get('/', (req, res) => {
  res.status(200).send('Server is OK');
});

app.use('/api', userRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:3001`);
});