import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { bookmarksController } from '../bookmarks/bookmarks.controller';
import { usersController } from './users.controller';
import { changePasswordZodSchema, updateUserZodSchema } from './users.validation';

const router = Router();

router.get('/me', checkAuth(), usersController.getProfile);
router.patch(
  '/me',
  checkAuth(),
  validateRequest(updateUserZodSchema),
  usersController.updateProfile,
);
router.get('/me/saved-duas', checkAuth(), bookmarksController.getSavedDuas);
router.post(
  '/change-password',
  checkAuth(),
  validateRequest(changePasswordZodSchema),
  usersController.changePassword,
);
router.get('/:username', optionalAuth(), usersController.getByUsername);

export const usersRoutes = router;
