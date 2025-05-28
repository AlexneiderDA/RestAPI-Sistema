// src/routes/auth.router-simple.ts - Versión simplificada para debugging
import { Router } from 'express';

const router = Router();

console.log('Creating auth router...');

// Rutas básicas sin middleware por ahora
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint' });
});

router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint' });
});

router.post('/refresh-token', (req, res) => {
  res.json({ message: 'Refresh token endpoint' });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint' });
});

console.log('Auth router created successfully');

export default router;