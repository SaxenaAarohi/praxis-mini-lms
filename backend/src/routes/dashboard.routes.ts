import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/me', asyncHandler(dashboardController.me));
router.get('/admin', requireAdmin, asyncHandler(dashboardController.admin));

export default router;
