import { Request, Response, NextFunction } from 'express';
import { resolveResourceId } from '../lib/urlCipher';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validates that route parameters containing an ID are either valid MongoDB ObjectIds
 * OR valid encrypted URL tokens.
 * Automatically resolves encrypted URL tokens to their raw MongoDB ObjectId.
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id) return next();

    // Check if directly a valid 24-character hexadecimal ObjectId
    if (OBJECT_ID_REGEX.test(id)) {
      return next();
    }

    // Attempt to resolve encrypted URL token
    const resolved = resolveResourceId(id);
    if (OBJECT_ID_REGEX.test(resolved)) {
      req.params[paramName] = resolved; // Decrypted into standard ObjectId for Prisma
      return next();
    }

    res.status(400).json({
      status: 'error',
      code: 'INVALID_OBJECT_ID',
      error: `Invalid resource identifier format: '${id}'. Expected 24-character hex ID or valid encrypted URL token.`,
    });
  };
};
