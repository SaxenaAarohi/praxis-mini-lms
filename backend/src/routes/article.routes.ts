import { Router } from 'express';
import * as articleController from '../controllers/article.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  progressSchema,
  updateArticleSchema,
} from '../validators/article.validator';
import { asyncHandler } from '../utils/asyncHandler';
import assignmentForArticleRoutes from './assignment-by-article.routes';

const router = Router();

router.get(
  '/',
  requireAuth,
  validate(listArticlesQuerySchema, 'query'),
  asyncHandler(articleController.list),
);

router.get('/tags', requireAuth, asyncHandler(articleController.tags));

router.get('/:slug', requireAuth, asyncHandler(articleController.getBySlug));

router.post('/', requireAuth, requireAdmin, validate(createArticleSchema), asyncHandler(articleController.create));
router.patch('/:id', requireAuth, requireAdmin, validate(updateArticleSchema), asyncHandler(articleController.update));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(articleController.remove));

router.post(
  '/:id/progress',
  requireAuth,
  validate(progressSchema),
  asyncHandler(articleController.setProgress),
);

// Nested: /api/articles/:articleId/assignment
router.use('/:articleId/assignment', assignmentForArticleRoutes);

export default router;
