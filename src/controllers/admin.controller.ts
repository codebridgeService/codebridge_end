import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getStats = async (req: Request, res: Response) => {
  try {
    const packagesCount = await prisma.package.count();
    const servicesCount = await prisma.service.count();
    const teamMembersCount = await prisma.teamMember.count();
    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();
    const projectRequestsCount = await prisma.projectRequest.count();
    const contactMessagesCount = await prisma.contactMessage.count();

    // Calculate Customer Satisfaction (Proxy: percentage of non-cancelled projects)
    const cancelledRequestsCount = await prisma.projectRequest.count({
      where: { status: 'cancelled' }
    });
    const satisfactionRate = projectRequestsCount > 0 
      ? Math.round(((projectRequestsCount - cancelledRequestsCount) / projectRequestsCount) * 100)
      : 100;

    // Calculate Average Response Time (Proxy: avg time from unread to read/archived)
    const respondedMessages = await prisma.contactMessage.findMany({
      where: { status: { not: 'unread' } },
      select: { createdAt: true, updatedAt: true }
    });
    
    let avgResponseTimeHours = 0;
    if (respondedMessages.length > 0) {
      const totalTimeMs = respondedMessages.reduce((sum, msg) => {
        return sum + (new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime());
      }, 0);
      avgResponseTimeHours = totalTimeMs / respondedMessages.length / (1000 * 60 * 60);
    }

    res.json({
      packages: packagesCount,
      services: servicesCount,
      teamMembers: teamMembersCount,
      users: usersCount,
      projects: projectsCount,
      projectRequests: projectRequestsCount,
      contactMessages: contactMessagesCount,
      customerSatisfaction: satisfactionRate,
      avgResponseTimeHours: Number(avgResponseTimeHours.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

export const getMessagesCount = async (req: Request, res: Response) => {
  try {
    const count = await prisma.contactMessage.count({ where: { status: 'unread' } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages count' });
  }
};

export const getProjectRequestsCount = async (req: Request, res: Response) => {
  try {
    const count = await prisma.projectRequest.count({ where: { status: 'pending' } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project requests count' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await prisma.contactMessage.findUnique({ where: { id: String(id) } });
    if (!message) return res.status(404).json({ error: 'Not found' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch message' });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await prisma.contactMessage.update({
      where: { id: String(id) },
      data: req.body,
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.contactMessage.delete({ where: { id: String(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

export const initDb = async (req: Request, res: Response) => {
  try {
    const collections = [
      'users',
      'services',
      'packages',
      'team_members',
      'password_reset_tokens',
      'contact_messages',
      'projects',
      'project_requests'
    ];

    const results = [];
    for (const coll of collections) {
      try {
        await prisma.$runCommandRaw({ create: coll });
        results.push(`Created collection: ${coll}`);
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          results.push(`Collection ${coll} already exists.`);
        } else {
          results.push(`Error creating ${coll}: ${e.message || e}`);
        }
      }
    }
    res.json({ message: 'Database initialized', results });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  }
};
