import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { authController } from './auth.controller';
import {
  facebookLoginZodSchema,
  googleLoginZodSchema,
  loginZodSchema,
  refreshTokenZodSchema,
  registerZodSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validateRequest(registerZodSchema), authController.register);
router.post('/login', validateRequest(loginZodSchema), authController.login);
router.post('/facebook', validateRequest(facebookLoginZodSchema), authController.facebookLogin);
router.post('/google', validateRequest(googleLoginZodSchema), authController.googleLogin);
router.post('/refresh', validateRequest(refreshTokenZodSchema), authController.refreshTokens);

router.post('/logout', checkAuth(), authController.logout);
router.get('/me', checkAuth(), authController.getMe);

export const authRoutes = router;
