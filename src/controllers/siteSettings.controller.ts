import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await (prisma as any).siteSetting.findFirst();
    if (!settings) {
      settings = await (prisma as any).siteSetting.create({
        data: {},
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const existing = await (prisma as any).siteSetting.findFirst();
    let updated;
    const { id, createdAt, updatedAt, ...rawUpdateData } = req.body;

    const booleanFields = [
      'showHero',
      'showServices',
      'showPackages',
      'showProjects',
      'showSecurity',
      'showFaq',
      'showTeam',
      'showHowWeWork',
      'showCta'
    ];

    const updateData: any = { ...rawUpdateData };
    booleanFields.forEach((field) => {
      if (field in updateData) {
        updateData[field] = Boolean(updateData[field]);
      }
    });

    if (existing) {
      updated = await (prisma as any).siteSetting.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      updated = await (prisma as any).siteSetting.create({
        data: updateData,
      });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
};
