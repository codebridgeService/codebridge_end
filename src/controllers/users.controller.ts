import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await (prisma.user as any).findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.user as any).findUnique({ 
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await (prisma.user as any).findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const item = await (prisma.user as any).create({
      data: {
        name: typeof name === 'string' ? name.trim().slice(0, 100) : '',
        email: email.trim().toLowerCase().slice(0, 150),
        password: hashedPassword,
        role: role === 'admin' ? 'admin' : 'user',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingUser = await (prisma.user as any).findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: 'Not found' });
    if (existingUser.role === 'admin' && req.body.role && req.body.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot demote an admin user' });
    }

    const data = { ...req.body };
    delete data.id;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;

    if (typeof req.body.password === 'string' && req.body.password.length >= 8) {
      data.password = await bcrypt.hash(req.body.password, 12);
    } else {
      delete data.password;
    }

    const item = await (prisma.user as any).update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating users:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingUser = await (prisma.user as any).findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: 'Not found' });
    if (existingUser.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete an admin user' });
    }

    await (prisma.user as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting users:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};
