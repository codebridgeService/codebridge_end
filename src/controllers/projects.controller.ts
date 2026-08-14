import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadToCloudinary } from '../lib/cloudinary';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await prisma.project.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(items);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch projects', message: error.message || 'Failed to fetch projects' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.project.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found', message: 'Project not found' });
    res.json(item);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch project', message: error.message || 'Failed to fetch project' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.order !== undefined) {
      const parsed = parseInt(data.order, 10);
      data.order = isNaN(parsed) ? 0 : parsed;
    } else {
      data.order = 0;
    }

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const uploadRes = await uploadToCloudinary(base64, 'projects');
      data.image = uploadRes.url;
    }

    if (!data.image) {
      data.image = '';
    }

    const item = await prisma.project.create({
      data,
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating projects:', error);
    res.status(500).json({ error: error.message || 'Failed to create project', message: error.message || 'Failed to create project' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const data = { ...req.body };
    if (data.order !== undefined) {
      const parsed = parseInt(data.order, 10);
      data.order = isNaN(parsed) ? 0 : parsed;
    }

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const uploadRes = await uploadToCloudinary(base64, 'projects');
      data.image = uploadRes.url;
    }

    // Remove undefined fields so they do not cause Prisma issues
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    const item = await prisma.project.update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error: any) {
    console.error('Error updating projects:', error);
    res.status(500).json({ error: error.message || 'Failed to update project', message: error.message || 'Failed to update project' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting projects:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project', message: error.message || 'Failed to delete project' });
  }
};

export const reorderProjects = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid orders data' });
    }

    await Promise.all(
      orders.map((o: any) =>
        prisma.project.update({
          where: { id: o.id },
          data: { order: o.order }
        })
      )
    );
    res.json({ message: 'Reordered successfully' });
  } catch (error: any) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder projects' });
  }
};

