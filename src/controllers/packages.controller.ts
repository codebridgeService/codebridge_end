import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.active === 'true') {
      where.isActive = true;
    }
    const items = await (prisma.package as any).findMany({
      where,
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
    console.error('Error fetching package:', error);
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

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    if (data.recommend !== undefined) {
      data.recommend = data.recommend === 'true' || data.recommend === true;
    }
    if (data.order !== undefined) {
      data.order = Number(data.order) || 0;
    }

    const item = await (prisma.package as any).create({
      data,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    if (data.recommend !== undefined) {
      data.recommend = data.recommend === 'true' || data.recommend === true;
    }
    if (data.order !== undefined) {
      data.order = Number(data.order) || 0;
    }

    const item = await (prisma.package as any).update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.package as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};
