import { Router } from 'express';
import authRoutes from './auth.routes.js';
import customersRoutes from './customers.routes.js';
import entriesRoutes from './entries.routes.js';
import chargesRoutes from './charges.routes.js';
import invoicesRoutes from './invoices.routes.js';
import settingsRoutes from './settings.routes.js';
import templatesRoutes from './templates.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/entries', entriesRoutes);
router.use('/charges', chargesRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/settings', settingsRoutes);
router.use('/templates', templatesRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
