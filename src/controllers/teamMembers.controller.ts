import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadToCloudinary } from '../lib/cloudinary';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await (prisma.teamMember as any).findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching teamMembers:', error);
    res.status(500).json({ error: 'Failed to fetch teamMembers' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.teamMember as any).findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching teamMembers:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.order !== undefined) data.order = parseInt(data.order, 10);

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const uploadRes = await uploadToCloudinary(base64, 'team');
      data.image = uploadRes.url;
    }

    const item = await (prisma.teamMember as any).create({
      data,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating teamMembers:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.order !== undefined) data.order = parseInt(data.order, 10);

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const uploadRes = await uploadToCloudinary(base64, 'team');
      data.image = uploadRes.url;
    }

    const item = await (prisma.teamMember as any).update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating teamMembers:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.teamMember as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting teamMembers:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};

export const reorderTeamMembers = async (req: Request, res: Response) => {
  console.log('REORDER ENDPOINT HIT!', req.body);
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      console.log('Invalid orders data:', orders);
      return res.status(400).json({ error: 'Invalid orders data' });
    }

    // Bulk update orders
    await Promise.all(
      orders.map((o: any) =>
        (prisma.teamMember as any).update({
          where: { id: o.id },
          data: { order: o.order }
        })
      )
    );
    
    console.log('Reordered successfully');
    res.json({ message: 'Reordered successfully' });
  } catch (error) {
    console.error('Error reordering teamMembers:', error);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};
