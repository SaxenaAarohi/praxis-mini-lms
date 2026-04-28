import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(leaderboardController.top));
router.get('/me/rank', asyncHandler(leaderboardController.myRank));

export default router;
