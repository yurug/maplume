import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createError } from './errorHandler';

// Extend Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authorization header required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

      if (decoded.type !== 'access') {
        throw createError('Invalid token type', 401, 'INVALID_TOKEN');
      }

      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw createError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      throw createError('Invalid token', 401, 'INVALID_TOKEN');
    }
  } catch (err) {
    next(err);
  }
}
