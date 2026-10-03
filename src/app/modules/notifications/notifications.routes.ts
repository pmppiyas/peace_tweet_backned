import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { notificationsController } from './notifications.controller';

const router = Router();

router.get('/', checkAuth(), notificationsController.getNotifications);
router.get('/unread-count', checkAuth(), notificationsController.getUnreadCount);
router.patch('/read-all', checkAuth(), notificationsController.markAllAsRead);
router.patch('/:id/read', checkAuth(), notificationsController.markAsRead);
router.delete('/:id', checkAuth(), notificationsController.remove);

export const notificationsRoutes = router;
