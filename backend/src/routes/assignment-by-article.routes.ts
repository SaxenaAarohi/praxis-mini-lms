import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { upsertAssignmentSchema } from '../validators/assignment.validator';
import { asyncHandler } from '../utils/asyncHandler';

// mounted at /api/articles/:articleId/assignment with mergeParams
const router = Router({ mergeParams: true });

router.get('/', requireAuth, asyncHandler(assignmentController.getForArticle));

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(upsertAssignmentSchema),
  asyncHandler(assignmentController.upsertForArticle),
);

export default router;
