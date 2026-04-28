import { Router } from 'express';
import authRoutes from './auth.routes';
import articleRoutes from './article.routes';
import assignmentRoutes from './assignment.routes';
import submissionRoutes from './submission.routes';
import leaderboardRoutes from './leaderboard.routes';
import dashboardRoutes from './dashboard.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);

export default router;
