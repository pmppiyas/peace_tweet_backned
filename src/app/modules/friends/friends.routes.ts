import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { friendsController } from './friends.controller';
import { sendFriendRequestZodSchema } from './friends.validation';

const router = Router();

router.post(
  '/requests',
  checkAuth(),
  validateRequest(sendFriendRequestZodSchema),
  friendsController.sendRequest,
);
router.get('/requests/received', checkAuth(), friendsController.getReceivedRequests);
router.get('/requests/sent', checkAuth(), friendsController.getSentRequests);
router.delete('/requests/:requestId', checkAuth(), friendsController.cancelRequest);
router.post('/requests/:requestId/accept', checkAuth(), friendsController.acceptRequest);
router.post('/requests/:requestId/reject', checkAuth(), friendsController.rejectRequest);
router.get('/status/:userId', optionalAuth(), friendsController.getStatus);
router.get('/', checkAuth(), friendsController.getFriends);
router.delete('/:userId', checkAuth(), friendsController.unfriend);

export const friendsRoutes = router;
