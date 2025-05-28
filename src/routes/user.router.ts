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

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Obtener todos los usuarios (solo admin)
router.get('/users', authorize([1]), getAllUsers);

// Obtener un usuario por ID (autenticado puede ver sus propios datos, admin puede ver todos)
router.get('/users/:id', ((req, res, next): void => {
  // Validar que el ID sea un número válido
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuario inválido' });
    return;
  }

  // Si es admin o está viendo su propio perfil, permitir
  if (req.user!.role === 1 || req.user!.userId === userId) {
    next();
    return;
  }
  res.status(403).json({ error: 'No autorizado para ver este perfil' });
}) as RequestHandler, getUserById);

// Crear usuario (solo admin)
router.post('/users', authorize([1]), createUser);

// Actualizar un usuario (admin puede actualizar cualquiera, usuario solo a sí mismo)
router.put('/users/:id', ((req, res, next): void => {
  // Validar que el ID sea un número válido
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuario inválido' });
    return;
  }

  if (req.user!.role === 1 || req.user!.userId === userId) {
    next();
    return;
  }
  res.status(403).json({ error: 'No autorizado para actualizar este perfil' });
}) as RequestHandler, updateUser);

// Eliminar un usuario (solo admin)
router.delete('/users/:id', authorize([1]), deleteUser);

export default router;