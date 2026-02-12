import { Router } from 'express';
import * as templatesController from '../controllers/templates.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(templatesController.getAll));
router.get('/:type', asyncHandler(templatesController.getByType));
router.put('/:type', asyncHandler(templatesController.update));
router.post('/:type/reset', asyncHandler(templatesController.reset));
router.post('/:type/preview', asyncHandler(templatesController.preview));

export default router;
