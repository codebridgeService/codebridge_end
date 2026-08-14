import { Request, Response } from 'express';
import {
  getBlockedIPs,
  blockIP,
  unblockIP,
  clearAllBlocks,
  normalizeIP,
} from '../middleware/attackShield.middleware';
import { prisma } from '../lib/prisma';

export const getBlockedIPsController = async (req: Request, res: Response) => {
  try {
    // 1. Get active in-memory blocks (live remaining times)
    const activeBlocks = getBlockedIPs();
    const activeIpSet = new Set(activeBlocks.map((b) => b.ip));

    // 2. Query database for any additional records (e.g., historical or permanent)
    const dbRecords = await prisma.blockedIp.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const now = Date.now();
    const combined = [...activeBlocks];

    for (const record of dbRecords) {
      if (!activeIpSet.has(record.ip)) {
        const isStillActive = record.isPermanent || (record.blockedUntil && record.blockedUntil.getTime() > now);
        if (isStillActive) {
          combined.push({
            ip: record.ip,
            blockedUntil: record.blockedUntil,
            reason: record.reason,
            attackCount: record.attackCount,
            remainingSeconds: record.isPermanent || !record.blockedUntil
              ? null
              : Math.ceil((record.blockedUntil.getTime() - now) / 1000),
            isPermanent: record.isPermanent,
            blockedBy: record.blockedBy,
            createdAt: record.createdAt,
          });
          activeIpSet.add(record.ip);
        }
      }
    }

    res.json({
      status: 'success',
      totalActive: combined.length,
      blockedIPs: combined,
    });
  } catch (error: any) {
    console.error('Error fetching blocked IPs:', error);
    res.status(500).json({ error: 'Failed to fetch blocked IPs', details: error.message });
  }
};

export const blockIPController = async (req: Request, res: Response) => {
  try {
    const { ip, durationMinutes, reason, isPermanent } = req.body;

    if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
      return res.status(400).json({ error: 'Valid IP address is required' });
    }

    const cleanIp = normalizeIP(ip);
    const customReason = reason && typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim()
      : 'Manual ban by administrator';

    const adminUser = (req as any).user?.email || 'admin';
    const permanent = Boolean(isPermanent);

    let durationMs: number | null = null;
    if (!permanent) {
      const minutes = Number(durationMinutes) || 15;
      durationMs = minutes * 60 * 1000;
    }

    blockIP(cleanIp, durationMs, customReason, adminUser, permanent);

    res.json({
      status: 'success',
      message: `IP ${cleanIp} has been ${permanent ? 'permanently' : 'temporarily'} blocked`,
      ip: cleanIp,
      reason: customReason,
      isPermanent: permanent,
      durationMinutes: permanent ? null : (durationMinutes || 15),
      blockedBy: adminUser,
    });
  } catch (error: any) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ error: 'Failed to block IP', details: error.message });
  }
};

export const unblockIPController = async (req: Request, res: Response) => {
  try {
    const rawIp = req.params.ip;

    if (!rawIp) {
      return res.status(400).json({ error: 'IP parameter is required' });
    }

    const ipStr = Array.isArray(rawIp) ? rawIp[0] : String(rawIp);
    const cleanIp = normalizeIP(decodeURIComponent(ipStr));
    await unblockIP(cleanIp);

    res.json({
      status: 'success',
      message: `IP ${cleanIp} has been unblocked successfully`,
      ip: cleanIp,
    });
  } catch (error: any) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP', details: error.message });
  }
};

export const clearAllBlocksController = async (req: Request, res: Response) => {
  try {
    const clearedCount = await clearAllBlocks();
    res.json({
      status: 'success',
      message: `All ${clearedCount} active IP blocks have been cleared`,
      clearedCount,
    });
  } catch (error: any) {
    console.error('Error clearing all blocks:', error);
    res.status(500).json({ error: 'Failed to clear blocks', details: error.message });
  }
};

export const getSecurityStatsController = async (req: Request, res: Response) => {
  try {
    const activeBlocks = getBlockedIPs();
    const permanentCount = activeBlocks.filter((b) => b.isPermanent).length;
    const temporaryCount = activeBlocks.filter((b) => !b.isPermanent).length;
    const totalAttacksDefended = activeBlocks.reduce((acc, b) => acc + (b.attackCount || 1), 0);

    res.json({
      shieldStatus: 'ACTIVE',
      totalActiveBlocks: activeBlocks.length,
      permanentBans: permanentCount,
      temporaryBans: temporaryCount,
      totalAttacksDefended,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({ error: 'Failed to fetch security stats', details: error.message });
  }
};
