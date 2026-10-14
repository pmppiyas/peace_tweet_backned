import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { feedbackController } from './feedback.controller';
import {
  createFeedbackZodSchema,
  updateFeedbackStatusZodSchema,
} from './feedback.validation';

const router = Router();

// Public / optional auth for submitting feedback or report
router.post(
  '/',
  optionalAuth(),
  validateRequest(createFeedbackZodSchema),
  feedbackController.createFeedback,
);

// Admin-only endpoints for viewing and moderating feedback/reports
router.get('/', checkAuth('ADMIN', 'MODERATOR'), feedbackController.getAllFeedbacks);
router.get('/:id', checkAuth('ADMIN', 'MODERATOR'), feedbackController.getFeedbackById);
router.patch(
  '/:id/status',
  checkAuth('ADMIN'),
  validateRequest(updateFeedbackStatusZodSchema),
  feedbackController.updateFeedbackStatus,
);

export const feedbackRoutes = router;
