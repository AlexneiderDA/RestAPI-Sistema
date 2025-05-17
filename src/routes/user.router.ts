import { Router, RequestHandler } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Rutas que requieren autenticación
// El middleware authenticate ya se aplica globalmente en index.ts

// Obtener todos los usuarios (solo admin)
router.get('/users', authorize([1]), getAllUsers);

// Obtener un usuario por ID (autenticado puede ver sus propios datos, admin puede ver todos)
router.get('/users/:id', ((req, res, next) => {
  // Si es admin o está viendo su propio perfil, permitir
  if (req.user.role === 1 || req.user.userId === parseInt(req.params.id)) {
    return next();
  }
  return res.status(403).json({ error: 'No autorizado para ver este perfil' });
}) as RequestHandler, getUserById);

// Crear usuario (solo admin)
router.post('/users', authorize([1]), createUser);

// Actualizar un usuario (admin puede actualizar cualquiera, usuario solo a sí mismo)
router.put('/users/:id', ((req, res, next) => {
  if (req.user.role === 1 || req.user.userId === parseInt(req.params.id)) {
    return next();
  }
  return res.status(403).json({ error: 'No autorizado para actualizar este perfil' });
}) as RequestHandler, updateUser);

// Eliminar un usuario (solo admin)
router.delete('/users/:id', authorize([1]), deleteUser);

export default router;