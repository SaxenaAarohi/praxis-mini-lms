import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import { chatSchema, hintSchema, summarizeSchema } from '../validators/ai.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth, aiLimiter);

router.post('/summarize', validate(summarizeSchema), asyncHandler(aiController.summarize));
router.post('/hint', validate(hintSchema), asyncHandler(aiController.hint));
router.post('/chat', validate(chatSchema), asyncHandler(aiController.chat));

export default router;
