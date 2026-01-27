import type { Request, Response } from 'express';
import { verifyPassword, isPasswordSet } from '../services/settings.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function login(req: Request, res: Response): Promise<void> {
  const { password } = req.body;

  const passwordRequired = await isPasswordSet();

  if (passwordRequired) {
    if (!password) {
      throw new AppError(400, 'Password is required');
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      throw new AppError(401, 'Invalid password');
    }
  }

  req.session.authenticated = true;
  res.json({ success: true, message: 'Logged in successfully' });
}

export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      throw new AppError(500, 'Failed to logout');
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

export async function checkAuth(req: Request, res: Response): Promise<void> {
  const passwordRequired = await isPasswordSet();

  res.json({
    authenticated: Boolean(req.session?.authenticated),
    passwordRequired,
  });
}
