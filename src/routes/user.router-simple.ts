// src/routes/user.router-simple.ts - Versión simplificada para debugging
import { Router } from 'express';

const router = Router();

console.log('Creating user router...');

// Rutas básicas sin parámetros complejos
router.get('/users', (req, res) => {
  res.json({ message: 'Get all users endpoint' });
});

// Ruta con parámetro simple
router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Get user ${id} endpoint` });
});

router.post('/users', (req, res) => {
  res.json({ message: 'Create user endpoint' });
});

router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Update user ${id} endpoint` });
});

router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Delete user ${id} endpoint` });
});

console.log('User router created successfully');

export default router;