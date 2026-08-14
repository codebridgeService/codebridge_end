import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await (prisma.package as any).findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.package as any).findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const item = await (prisma.package as any).create({
      data: req.body,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating packages:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.package as any).update({
      where: { id },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating packages:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.package as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting packages:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};
