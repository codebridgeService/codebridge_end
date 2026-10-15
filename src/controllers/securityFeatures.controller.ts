import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.active === 'true') {
      where.isActive = true;
    }
    const items = await (prisma as any).securityFeature.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching security features:', error);
    res.status(500).json({ error: 'Failed to fetch security features' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma as any).securityFeature.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Security feature not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching security feature:', error);
    res.status(500).json({ error: 'Failed to fetch security feature' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { title, titleKh, description, descriptionKh, icon, color, order, isActive } = req.body;
    const item = await (prisma as any).securityFeature.create({
      data: {
        title,
        titleKh: titleKh || '',
        description,
        descriptionKh: descriptionKh || '',
        icon: icon || 'ShieldCheckIcon',
        color: color || '#3B82F6',
        order: typeof order === 'number' ? order : 0,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating security feature:', error);
    res.status(500).json({ error: 'Failed to create security feature' });
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
    if (data.order !== undefined) {
      data.order = Number(data.order) || 0;
    }

    const item = await (prisma as any).securityFeature.update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating security feature:', error);
    res.status(500).json({ error: 'Failed to update security feature' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).securityFeature.delete({ where: { id } });
    res.json({ message: 'Security feature deleted successfully' });
  } catch (error) {
    console.error('Error deleting security feature:', error);
    res.status(500).json({ error: 'Failed to delete security feature' });
  }
};

export const reorder = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const updates = items.map((item: { id: string; order: number }) =>
      (prisma as any).securityFeature.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );

    await Promise.all(updates);
    res.json({ message: 'Security features reordered successfully' });
  } catch (error) {
    console.error('Error reordering security features:', error);
    res.status(500).json({ error: 'Failed to reorder security features' });
  }
};
