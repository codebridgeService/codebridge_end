import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
    }
    console.warn('[SECURITY WARNING]: JWT_SECRET is not set in environment. Falling back to default development secret.');
    return 'your-secret-key-dev-only';
  }
  return secret;
};

export const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET environment variable is missing in production!');
    }
    return 'your-refresh-secret-dev-only';
  }
  return secret;
};

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Unauthorized: Access token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ message: 'Unauthorized: Invalid token', code: 'INVALID_TOKEN' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
