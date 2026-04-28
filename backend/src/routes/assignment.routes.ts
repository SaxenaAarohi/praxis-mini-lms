import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { upsertAssignmentSchema } from '../validators/assignment.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/:id/admin', requireAuth, requireAdmin, asyncHandler(assignmentController.getAdmin));

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(upsertAssignmentSchema),
  asyncHandler(assignmentController.update),
);

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(assignmentController.remove));

export default router;
