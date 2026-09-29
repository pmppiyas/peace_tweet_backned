import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { groupsController } from './groups.controller';
import {
  changeMemberRoleZodSchema,
  createGroupPostZodSchema,
  createGroupZodSchema,
  updateGroupZodSchema,
} from './groups.validation';

const router = Router();

router.post('/', checkAuth(), validateRequest(createGroupZodSchema), groupsController.createGroup);
router.get('/', optionalAuth(), groupsController.discoverGroups);
router.get('/me', checkAuth(), groupsController.getMyGroups);
router.get('/by-id/:groupId', optionalAuth(), groupsController.getGroupById);
router.get('/:groupId/membership', optionalAuth(), groupsController.getMembershipStatus);
router.get('/:groupId/members', optionalAuth(), groupsController.getMembers);
router.get('/:groupId/requests', checkAuth(), groupsController.getJoinRequests);
router.post(
  '/:groupId/requests/:requestId/accept',
  checkAuth(),
  groupsController.acceptJoinRequest,
);
router.post(
  '/:groupId/requests/:requestId/reject',
  checkAuth(),
  groupsController.rejectJoinRequest,
);
router.post('/:groupId/join', checkAuth(), groupsController.joinGroup);
router.delete('/:groupId/join-request', checkAuth(), groupsController.cancelJoinRequest);
router.delete('/:groupId/leave', checkAuth(), groupsController.leaveGroup);
router.delete('/:groupId/members/:userId', checkAuth(), groupsController.removeMember);
router.patch(
  '/:groupId/members/:userId/role',
  checkAuth(),
  validateRequest(changeMemberRoleZodSchema),
  groupsController.changeMemberRole,
);
router.get('/:groupId/posts', optionalAuth(), groupsController.getGroupPosts);
router.post(
  '/:groupId/posts',
  checkAuth(),
  validateRequest(createGroupPostZodSchema),
  groupsController.createGroupPost,
);
router.get('/:slug', optionalAuth(), groupsController.getGroupBySlug);
router.patch(
  '/:groupId',
  checkAuth(),
  validateRequest(updateGroupZodSchema),
  groupsController.updateGroup,
);
router.delete('/:groupId', checkAuth(), groupsController.deleteGroup);

export const groupsRoutes = router;
