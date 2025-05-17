import { Router, RequestHandler} from 'express';
import { register, login, refreshAccessToken, logout } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

const router = Router();

// Rutas de autenticación
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

export default router;