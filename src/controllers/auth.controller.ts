import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../utils/password.util.js';
import { generateToken, generateRefreshToken } from '../utils/token.util.js';
import { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { AUTH_CONFIG } from '../config/auth.config.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Registra un nuevo usuario
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as RegisterInput;

  try {
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({ error: 'El correo electrónico ya está registrado' });
      return;
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        rolId: 2 // Rol por defecto (asumiendo 2 para usuarios normales, 1 para admin)
      }
    });

    // Generar tokens
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.rolId
    });
    
    const refreshToken = generateRefreshToken(newUser.id);

    // Respuesta sin incluir la contraseña
    const { password: _, ...userWithoutPassword } = newUser;

    // Establecer refresh token en cookie
    res.cookie('refreshToken', refreshToken, AUTH_CONFIG.cookieOptions);

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Inicia sesión de usuario
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  try {
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Verificar contraseña
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Generar tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.rolId
    });
    
    const refreshToken = generateRefreshToken(user.id);

    // Respuesta sin incluir la contraseña
    const { password: _, ...userWithoutPassword } = user;

    // Establecer refresh token en cookie
    res.cookie('refreshToken', refreshToken, AUTH_CONFIG.cookieOptions);

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Refresca el token de autenticación usando el refresh token
 */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token no proporcionado' });
    return;
  }

  try {
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, AUTH_CONFIG.jwtSecret) as { userId: number };
    
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Generar nuevo token de acceso
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.rolId
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
};

/**
 * Cierra la sesión del usuario
 */
export const logout = (req: Request, res: Response): void => {
  // Limpiar cookie de refresh token
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Sesión cerrada correctamente' });
};
