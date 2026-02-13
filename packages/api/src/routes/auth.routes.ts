import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

const router = Router();

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/check', asyncHandler(authController.checkAuth));

export default router;
