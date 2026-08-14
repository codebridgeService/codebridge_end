import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await (prisma.service as any).findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.service as any).findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const item = await (prisma.service as any).create({
      data: req.body,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating services:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.service as any).update({
      where: { id },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating services:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.service as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting services:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};
