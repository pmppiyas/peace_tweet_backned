import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { bookmarksController } from '../bookmarks/bookmarks.controller';
import { usersController } from './users.controller';
import {
  changePasswordZodSchema,
  confirmEmailVerificationZodSchema,
  sendEmailVerificationZodSchema,
  updateUserZodSchema,
  verifyEmailWithGoogleZodSchema,
} from './users.validation';

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
router.post(
  '/me/verify-email/request',
  checkAuth(),
  validateRequest(sendEmailVerificationZodSchema),
  usersController.sendEmailVerification,
);
router.post(
  '/me/verify-email/confirm',
  checkAuth(),
  validateRequest(confirmEmailVerificationZodSchema),
  usersController.confirmEmailVerification,
);
router.post(
  '/me/verify-email/google',
  checkAuth(),
  validateRequest(verifyEmailWithGoogleZodSchema),
  usersController.verifyEmailWithGoogle,
);
router.get('/:username', optionalAuth(), usersController.getByUsername);

export const usersRoutes = router;
