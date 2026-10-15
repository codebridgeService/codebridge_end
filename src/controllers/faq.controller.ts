import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.active === 'true') {
      where.isActive = true;
    }
    const items = await (prisma as any).faq.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma as any).faq.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'FAQ not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { question, questionKh, answer, answerKh, category, categoryKh, order, isActive } = req.body;
    const item = await (prisma as any).faq.create({
      data: {
        question,
        questionKh: questionKh || '',
        answer,
        answerKh: answerKh || '',
        category: category || 'General',
        categoryKh: categoryKh || 'ទូទៅ',
        order: typeof order === 'number' ? order : 0,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
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

    const item = await (prisma as any).faq.update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).faq.delete({ where: { id } });
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
};

export const reorder = async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { id, order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const updates = items.map((item: { id: string; order: number }) =>
      (prisma as any).faq.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );

    await Promise.all(updates);
    res.json({ message: 'FAQs reordered successfully' });
  } catch (error) {
    console.error('Error reordering FAQs:', error);
    res.status(500).json({ error: 'Failed to reorder FAQs' });
  }
};
