import { Router } from 'express';
import * as chargesController from '../controllers/charges.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Get charge types (for dropdowns)
router.get('/types', chargesController.getChargeTypes);

// Get all unbilled charges
router.get('/unbilled', chargesController.getUnbilledCharges);

// CRUD operations
router.get('/', chargesController.getAllCharges);
router.get('/:id', chargesController.getCharge);
router.post('/', chargesController.createCharge);
router.put('/:id', chargesController.updateCharge);
router.delete('/:id', chargesController.deleteCharge);

export default router;
