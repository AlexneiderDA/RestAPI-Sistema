import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { hashPassword } from '../utils/password.util.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Get all users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        rolId: true,
        createdAt: true,
        updatedAt: true,
        // Excluir password
      }
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        rolId: true,
        createdAt: true,
        updatedAt: true,
        // Excluir password
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, rolId = 2 } = req.body;

  try {
    // Validación básica
    if (!name || !email || !password) {
      res.status(400).json({ 
        error: 'Datos incompletos', 
        details: 'Nombre, email y contraseña son obligatorios' 
      });
      return;
    }

    // Hash de contraseña
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        rolId: Number(rolId),
      },
    });

    // Excluir password de la respuesta
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Manejo específico para error de email duplicado
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Email ya existe' });
        return;
      }
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update a user by ID
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, password, rolId } = req.body;

  // Preparar datos para actualización
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (rolId) updateData.rolId = Number(rolId);
  
  // Si se proporciona password, hashearlo
  if (password) {
    updateData.password = await hashPassword(password);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        rolId: true,
        createdAt: true,
        updatedAt: true,
        // Excluir password
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a user by ID
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error instanceof PrismaClientKnownRequestError) {
      // Manejo específico para error de usuario no encontrado
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }
        
    res.status(500).json({ error: 'Internal Server Error' });
  }
};