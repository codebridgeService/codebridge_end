import { Request, Response, NextFunction } from 'express';

// Known malicious or automated bot signatures, security scanners, and scrapers
const BOT_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /zgrab/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /libwww-perl/i,
  /scrapy/i,
  /shodan/i,
  /censys/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /havij/i,
  /hydra/i,
  /medusa/i,
];

export const botProtection = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'] || '';

  // Check if User-Agent matches any known malicious bot/scanner pattern
  const isMaliciousBot = BOT_USER_AGENTS.some((pattern) => pattern.test(userAgent));

  if (isMaliciousBot) {
    res.status(403).json({
      status: 'error',
      message: 'Access denied: Bot activity detected.',
    });
    return;
  }

  next();
};
