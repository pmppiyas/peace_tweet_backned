import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { bloodController } from './blood.controller';
import {
  createBloodRequestZodSchema,
  updateBloodRequestStatusZodSchema,
  toggleDonorModeZodSchema,
} from './blood.validation';

const router = Router();

// Blood Requests CRUD & Actions
router.post(
  '/requests',
  checkAuth(),
  validateRequest(createBloodRequestZodSchema),
  bloodController.createRequest,
);

router.get('/requests', optionalAuth(), bloodController.getAllRequests);
router.get('/requests/:id', optionalAuth(), bloodController.getRequestById);

// Donor acceptance & completion workflow
router.post(
  '/requests/:id/accept',
  checkAuth(),
  bloodController.acceptRequest,
);

router.patch(
  '/requests/:id/donations/:donationId/complete',
  checkAuth(),
  bloodController.completeDonation,
);

router.delete(
  '/requests/:id/donations/cancel',
  checkAuth(),
  bloodController.cancelDonation,
);

router.patch(
  '/requests/:id/status',
  checkAuth(),
  validateRequest(updateBloodRequestStatusZodSchema),
  bloodController.updateRequestStatus,
);

// Donor Mode & Discovery
router.get('/donor-mode', checkAuth(), bloodController.getDonorModeStatus);

router.post(
  '/donor-mode',
  checkAuth(),
  validateRequest(toggleDonorModeZodSchema),
  bloodController.toggleDonorMode,
);

router.patch(
  '/donor-mode',
  checkAuth(),
  validateRequest(toggleDonorModeZodSchema),
  bloodController.toggleDonorMode,
);

router.get('/donors', optionalAuth(), bloodController.getAvailableDonors);

export const bloodRoutes = router;
