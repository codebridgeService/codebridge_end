import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface BlockedEntry {
  blockedUntil: number | null; // null means permanent
  reason: string;
  attackCount: number;
  isPermanent: boolean;
  blockedBy: string;
  createdAt: Date;
}

interface IPHistory {
  timestamps: number[];
  failedAuthCount: number;
  lastFailedTime: number;
}

// In-memory thread-safe IP ban table and request tracker
const blockedIPs = new Map<string, BlockedEntry>();
const ipHistory = new Map<string, IPHistory>();

export const DEFAULT_BAN_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BURST_WINDOW_MS = 10 * 1000; // 10 seconds
const MAX_BURST_REQUESTS = 60; // Max 60 requests per 10s per IP
const MAX_FAILED_ATTEMPTS = 5; // 5 failed auth attempts = Auto-ban
const FAILED_ATTEMPTS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const normalizeIP = (rawIp?: string | string[]): string => {
  if (!rawIp) return '127.0.0.1';
  let ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip.trim();
};

export const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const remote = req.socket?.remoteAddress;
  return normalizeIP((forwarded as string) || remote || req.ip);
};

const logInfo = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(...args);
  }
};

const logWarn = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(...args);
  }
};

const logError = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(...args);
  }
};

/**
 * Load persisted active blocks from MongoDB on server startup
 */
export const initBlockedIPsFromDb = async (): Promise<void> => {
  try {
    const now = new Date();
    const dbBlocks = await prisma.blockedIp.findMany({
      where: {
        OR: [
          { isPermanent: true },
          { blockedUntil: { gt: now } },
        ],
      },
    });

    for (const b of dbBlocks) {
      blockedIPs.set(b.ip, {
        blockedUntil: b.isPermanent ? null : (b.blockedUntil ? b.blockedUntil.getTime() : null),
        reason: b.reason,
        attackCount: b.attackCount,
        isPermanent: b.isPermanent,
        blockedBy: b.blockedBy,
        createdAt: b.createdAt,
      });
    }
    logInfo(`🛡️ [ATTACK SHIELD] Loaded ${dbBlocks.length} active IP ban(s) from database.`);
  } catch (err: any) {
    logError('⚠️ [ATTACK SHIELD] Failed to load blocked IPs from database:', err.message);
  }
};

// Initial sync call
initBlockedIPsFromDb().catch(() => {});

/**
 * Block an IP address in memory and persist in database
 */
export const blockIP = (
  ip: string,
  durationMs: number | null = DEFAULT_BAN_DURATION_MS,
  reason: string = 'Automated attack detection',
  blockedBy: string = 'SYSTEM_ATTACK_SHIELD',
  isPermanent: boolean = false
): void => {
  const cleanIp = normalizeIP(ip);
  const existing = blockedIPs.get(cleanIp);
  const attackCount = (existing?.attackCount || 0) + 1;
  const blockedUntilTime = isPermanent || durationMs === null ? null : Date.now() + durationMs;
  const blockedUntilDate = blockedUntilTime ? new Date(blockedUntilTime) : null;
  const createdAt = existing?.createdAt || new Date();

  blockedIPs.set(cleanIp, {
    blockedUntil: blockedUntilTime,
    reason,
    attackCount,
    isPermanent,
    blockedBy,
    createdAt,
  });

  // Persist to database asynchronously
  prisma.blockedIp.upsert({
    where: { ip: cleanIp },
    update: {
      reason,
      attackCount,
      blockedUntil: blockedUntilDate,
      isPermanent,
      blockedBy,
    },
    create: {
      ip: cleanIp,
      reason,
      attackCount,
      blockedUntil: blockedUntilDate,
      isPermanent,
      blockedBy,
    },
  }).catch((err) => {
    logError(`⚠️ [ATTACK SHIELD] DB sync error for ${cleanIp}:`, err.message);
  });

  const durationStr = isPermanent ? 'PERMANENTLY' : `for ${Math.round((durationMs || 0) / 1000)}s`;
  logWarn(
    `🚨 [ATTACK SHIELD] IP BLOCKED: ${cleanIp} ${durationStr} | Reason: ${reason} (Incident #${attackCount}) [By: ${blockedBy}]`
  );
};

/**
 * Unblock an IP address from memory and database
 */
export const unblockIP = async (ip: string): Promise<boolean> => {
  const cleanIp = normalizeIP(ip);
  const removedFromMemory = blockedIPs.delete(cleanIp);
  ipHistory.delete(cleanIp);

  let removedFromDb = false;
  try {
    const deleted = await prisma.blockedIp.deleteMany({
      where: { ip: cleanIp },
    });
    removedFromDb = deleted.count > 0;
  } catch (err: any) {
    logError(`⚠️ [ATTACK SHIELD] Failed to unblock ${cleanIp} in DB:`, err.message);
  }

  logInfo(`🔓 [ATTACK SHIELD] IP UNBLOCKED: ${cleanIp}`);
  return removedFromMemory || removedFromDb;
};

/**
 * Check if an IP is currently blocked
 */
export const isIPBlocked = (ip: string): boolean => {
  const cleanIp = normalizeIP(ip);
  const entry = blockedIPs.get(cleanIp);
  if (!entry) return false;

  if (entry.isPermanent) return true;

  if (entry.blockedUntil && Date.now() > entry.blockedUntil) {
    blockedIPs.delete(cleanIp);
    prisma.blockedIp.deleteMany({ where: { ip: cleanIp } }).catch(() => {});
    return false;
  }
  return true;
};

/**
 * Retrieve all currently blocked IPs with details
 */
export const getBlockedIPs = () => {
  const now = Date.now();
  const active: Array<{
    ip: string;
    blockedUntil: Date | null;
    reason: string;
    attackCount: number;
    remainingSeconds: number | null;
    isPermanent: boolean;
    blockedBy: string;
    createdAt: Date;
  }> = [];

  for (const [ip, entry] of blockedIPs.entries()) {
    if (entry.isPermanent) {
      active.push({
        ip,
        blockedUntil: null,
        reason: entry.reason,
        attackCount: entry.attackCount,
        remainingSeconds: null,
        isPermanent: true,
        blockedBy: entry.blockedBy,
        createdAt: entry.createdAt,
      });
    } else if (entry.blockedUntil && now <= entry.blockedUntil) {
      active.push({
        ip,
        blockedUntil: new Date(entry.blockedUntil),
        reason: entry.reason,
        attackCount: entry.attackCount,
        remainingSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
        isPermanent: false,
        blockedBy: entry.blockedBy,
        createdAt: entry.createdAt,
      });
    } else {
      blockedIPs.delete(ip);
      prisma.blockedIp.deleteMany({ where: { ip } }).catch(() => {});
    }
  }

  return active;
};

/**
 * Clear all IP blocks (emergency unblock all)
 */
export const clearAllBlocks = async (): Promise<number> => {
  const count = blockedIPs.size;
  blockedIPs.clear();
  ipHistory.clear();

  try {
    await prisma.blockedIp.deleteMany({});
  } catch (err: any) {
    logError('⚠️ [ATTACK SHIELD] Error clearing all blocked IPs from DB:', err.message);
  }

  logInfo(`🔓 [ATTACK SHIELD] All ${count} IP blocks have been cleared.`);
  return count;
};

/**
 * Record a failed authentication attempt and auto-ban if threshold exceeded
 */
export const recordFailedAttempt = (ip: string, reason: string = 'Failed authentication'): void => {
  const cleanIp = normalizeIP(ip);
  const now = Date.now();
  const history = ipHistory.get(cleanIp) || {
    timestamps: [],
    failedAuthCount: 0,
    lastFailedTime: 0,
  };

  if (now - history.lastFailedTime > FAILED_ATTEMPTS_WINDOW_MS) {
    history.failedAuthCount = 1;
  } else {
    history.failedAuthCount += 1;
  }
  history.lastFailedTime = now;
  ipHistory.set(cleanIp, history);

  if (history.failedAuthCount >= MAX_FAILED_ATTEMPTS) {
    blockIP(
      cleanIp,
      DEFAULT_BAN_DURATION_MS,
      `Exceeded ${MAX_FAILED_ATTEMPTS} failed attempts: ${reason}`,
      'SYSTEM_ATTACK_SHIELD',
      false
    );
  }
};

/**
 * Record a successful authentication attempt (reset failure counter)
 */
export const recordSuccessfulAuth = (ip: string): void => {
  const cleanIp = normalizeIP(ip);
  const history = ipHistory.get(cleanIp);
  if (history) {
    history.failedAuthCount = 0;
  }
};

// Periodic garbage collection to keep memory minimal
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of blockedIPs.entries()) {
    if (!entry.isPermanent && entry.blockedUntil && now > entry.blockedUntil) {
      blockedIPs.delete(ip);
      prisma.blockedIp.deleteMany({ where: { ip } }).catch(() => {});
    }
  }
  for (const [ip, history] of ipHistory.entries()) {
    history.timestamps = history.timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    if (history.timestamps.length === 0 && now - history.lastFailedTime > FAILED_ATTEMPTS_WINDOW_MS) {
      ipHistory.delete(ip);
    }
  }
}, 60 * 1000).unref();

/**
 * Express middleware mounted at the front of the API.
 * Instantly terminates requests from blocked IPs with 403 Forbidden.
 * Also monitors burst request flooding and auto-blocks offenders.
 */
export const attackShield = (req: Request, res: Response, next: NextFunction): void => {
  const ip = getClientIP(req);
  const now = Date.now();

  // Step 1: Check active blocklist
  const blockEntry = blockedIPs.get(ip);
  if (blockEntry) {
    const isStillBlocked = blockEntry.isPermanent || (blockEntry.blockedUntil && now <= blockEntry.blockedUntil);
    if (isStillBlocked) {
      const remainingSeconds = blockEntry.blockedUntil
        ? Math.ceil((blockEntry.blockedUntil - now) / 1000)
        : null;

      res.status(403).json({
        status: 'blocked',
        code: 'IP_BLOCKED',
        message: 'Access Denied: Your IP has been temporarily blocked due to malicious attack detection.',
        reason: blockEntry.reason,
        isPermanent: blockEntry.isPermanent,
        retryAfterSeconds: remainingSeconds,
      });
      return;
    } else {
      blockedIPs.delete(ip);
      prisma.blockedIp.deleteMany({ where: { ip } }).catch(() => {});
    }
  }

  // Step 2: Flood / Burst attack detection
  let history = ipHistory.get(ip);
  if (!history) {
    history = { timestamps: [], failedAuthCount: 0, lastFailedTime: 0 };
    ipHistory.set(ip, history);
  }

  history.timestamps.push(now);
  history.timestamps = history.timestamps.filter((t) => now - t <= BURST_WINDOW_MS);

  if (history.timestamps.length > MAX_BURST_REQUESTS) {
    blockIP(
      ip,
      DEFAULT_BAN_DURATION_MS,
      `High-frequency API flood attack (${history.timestamps.length} reqs / 10s)`,
      'SYSTEM_ATTACK_SHIELD',
      false
    );
    res.status(403).json({
      status: 'blocked',
      code: 'FLOOD_ATTACK_BLOCKED',
      message: 'Access Denied: High-frequency API flood attack detected. Your IP has been blocked.',
      retryAfterSeconds: Math.round(DEFAULT_BAN_DURATION_MS / 1000),
    });
    return;
  }

  next();
};
