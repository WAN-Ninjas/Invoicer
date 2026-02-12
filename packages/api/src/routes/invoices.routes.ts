import { Router } from 'express';
import * as invoicesController from '../controllers/invoices.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(invoicesController.getAll));
router.get('/summary', asyncHandler(invoicesController.getSummary));
router.get('/:id', asyncHandler(invoicesController.getById));
router.post('/', asyncHandler(invoicesController.create));
router.put('/:id', asyncHandler(invoicesController.update));
router.delete('/:id', asyncHandler(invoicesController.remove));

// Entry management
router.post('/:id/entries', asyncHandler(invoicesController.addEntries));
router.delete('/:id/entries/:entryId', asyncHandler(invoicesController.removeEntry));
router.post('/:id/recalculate', asyncHandler(invoicesController.recalculate));

// PDF and email
router.get('/:id/pdf', asyncHandler(invoicesController.downloadPdf));
router.post('/:id/send', asyncHandler(invoicesController.sendEmail));
router.post('/:id/remind', asyncHandler(invoicesController.sendReminder));

export default router;
