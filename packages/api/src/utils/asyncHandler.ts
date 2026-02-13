import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Express 5 catches async errors natively, so this is now a simple pass-through.
// Kept for backwards compatibility with existing route files.
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return fn as unknown as RequestHandler;
}
