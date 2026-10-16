import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    let whereClause: any = {};

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role === 'admin') {
      const { email } = req.query;
      if (email) whereClause.email = String(email);
    } else {
      // Regular user can only see their own requests
      whereClause.email = user.email;
    }
    
    const items = await (prisma.projectRequest as any).findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching projectRequests:', error);
    res.status(500).json({ error: 'Failed to fetch projectRequests' });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const item = await (prisma.projectRequest as any).findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    if (user.role !== 'admin' && item.email !== user.email) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching projectRequests:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      businessName,
      businessType,
      websiteGoals,
      pagesNeeded,
      designPreference,
      competitors,
      packageId,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const item = await (prisma.projectRequest as any).create({
      data: {
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 150),
        phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim().slice(0, 50) : null,
        businessName: typeof businessName === 'string' ? businessName.trim().slice(0, 150) : null,
        businessType: typeof businessType === 'string' ? businessType.trim().slice(0, 100) : null,
        websiteGoals: typeof websiteGoals === 'string' ? websiteGoals.trim().slice(0, 1000) : null,
        pagesNeeded: typeof pagesNeeded === 'string' ? pagesNeeded.trim().slice(0, 500) : null,
        designPreference: typeof designPreference === 'string' ? designPreference.trim().slice(0, 500) : null,
        competitors: typeof competitors === 'string' ? competitors.trim().slice(0, 500) : null,
        packageId: typeof packageId === 'string' && packageId.length === 24 ? packageId : null,
        status: 'pending', // Always lock to pending on initial public creation
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating projectRequests:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;

    const item = await (prisma.projectRequest as any).update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating projectRequests:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.projectRequest as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting projectRequests:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};

