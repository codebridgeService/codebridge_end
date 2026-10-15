import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.active === 'true') {
      where.isActive = true;
    }
    const items = await (prisma as any).workStep.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { stepNumber: 'asc' },
      ],
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching work steps:', error);
    res.status(500).json({ error: 'Failed to fetch work steps' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma as any).workStep.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Work step not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching work step:', error);
    res.status(500).json({ error: 'Failed to fetch work step' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { stepNumber, title, titleKh, description, descriptionKh, order, isActive } = req.body;
    const item = await (prisma as any).workStep.create({
      data: {
        stepNumber: stepNumber || '01',
        title,
        titleKh: titleKh || '',
        description,
        descriptionKh: descriptionKh || '',
        order: typeof order === 'number' ? order : 0,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating work step:', error);
    res.status(500).json({ error: 'Failed to create work step' });
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

    const item = await (prisma as any).workStep.update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating work step:', error);
    res.status(500).json({ error: 'Failed to update work step' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).workStep.delete({ where: { id } });
    res.json({ message: 'Work step deleted successfully' });
  } catch (error) {
    console.error('Error deleting work step:', error);
    res.status(500).json({ error: 'Failed to delete work step' });
  }
};

export const reorder = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const updates = items.map((item: { id: string; order: number }) =>
      (prisma as any).workStep.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );

    await Promise.all(updates);
    res.json({ message: 'Work steps reordered successfully' });
  } catch (error) {
    console.error('Error reordering work steps:', error);
    res.status(500).json({ error: 'Failed to reorder work steps' });
  }
};
