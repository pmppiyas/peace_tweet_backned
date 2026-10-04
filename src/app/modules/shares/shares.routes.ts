import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { sharesController } from './shares.controller';
import { createShareZodSchema } from './shares.validation';

const router = Router();

router.get('/', optionalAuth(), sharesController.getShares);
router.post(
  '/',
  checkAuth(),
  validateRequest(createShareZodSchema),
  sharesController.createShare,
);
router.delete('/:id', checkAuth(), sharesController.deleteShare);

export const sharesRoutes = router;
