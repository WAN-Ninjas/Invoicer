import { Router } from 'express';
import * as entriesController from '../controllers/entries.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadCsv } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(entriesController.getAll));
router.get('/unbilled/:customerId', asyncHandler(entriesController.getUnbilled));
router.get('/:id', asyncHandler(entriesController.getById));
router.post('/', asyncHandler(entriesController.create));
router.put('/:id', asyncHandler(entriesController.update));
router.delete('/:id', asyncHandler(entriesController.remove));

// CSV import
router.post('/import/preview', uploadCsv.single('file'), asyncHandler(entriesController.previewImport));
router.post('/import', uploadCsv.single('file'), asyncHandler(entriesController.importCsv));

export default router;
