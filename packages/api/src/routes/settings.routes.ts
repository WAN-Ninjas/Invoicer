import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadLogo } from '../middleware/upload.js';

const router = Router();

// Public settings (for login page, etc.)
router.get('/public', asyncHandler(settingsController.getPublicSettings));

// Protected settings
router.use(requireAuth);

router.get('/', asyncHandler(settingsController.getSettings));
router.put('/', asyncHandler(settingsController.updateSettings));
router.post('/logo', uploadLogo.single('logo'), asyncHandler(settingsController.uploadLogo));

export default router;
