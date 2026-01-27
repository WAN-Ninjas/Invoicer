import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session?.authenticated) {
    throw new AppError(401, 'Authentication required');
  }
  next();
}
