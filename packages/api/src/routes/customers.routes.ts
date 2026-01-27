import { Router } from 'express';
import * as customersController from '../controllers/customers.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(customersController.getAll));
router.get('/:id', asyncHandler(customersController.getById));
router.post('/', asyncHandler(customersController.create));
router.put('/:id', asyncHandler(customersController.update));
router.delete('/:id', asyncHandler(customersController.remove));

export default router;
