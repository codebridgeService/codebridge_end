import { Request, Response } from 'express';
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
    const data = { ...req.body };
    delete data.id;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;

    const item = await (prisma.user as any).create({
      data,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating users:', error);
    res.status(500).json({ error: 'Failed to create' });
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
    delete data.password;

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
