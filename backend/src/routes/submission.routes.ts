import { Router } from 'express';
import * as submissionController from '../controllers/submission.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { createSubmissionSchema } from '../validators/submission.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createSubmissionSchema), asyncHandler(submissionController.create));
router.get('/me', asyncHandler(submissionController.listMine));
router.get('/me/article/:articleId', asyncHandler(submissionController.getMyLatestForArticle));
router.get('/admin/recent', requireAdmin, asyncHandler(submissionController.adminRecent));
router.get('/:id', asyncHandler(submissionController.getOne));

export default router;
