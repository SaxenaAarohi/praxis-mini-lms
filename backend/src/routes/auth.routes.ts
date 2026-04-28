import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { loginSchema, signupSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/signup', authLimiter, validate(signupSchema), asyncHandler(authController.signup));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/logout', requireAuth, asyncHandler(authController.logout));

export default router;
