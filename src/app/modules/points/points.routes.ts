import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { pointsController } from './points.controller';

const router = Router();

router.get('/me', checkAuth(), pointsController.getMyPointsDashboard);
router.get('/history', checkAuth(), pointsController.getMyPointsHistory);
router.post('/check-in', checkAuth(), pointsController.checkIn);
router.get('/leaderboard', optionalAuth(), pointsController.getLeaderboard);

export const pointsRoutes = router;
