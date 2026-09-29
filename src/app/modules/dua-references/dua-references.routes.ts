import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { duaReferencesController } from './dua-references.controller';
import {
  createDuaReferenceZodSchema,
  updateDuaReferenceZodSchema,
} from './dua-references.validation';

const router = Router({ mergeParams: true });

router.post(
  '/',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(createDuaReferenceZodSchema),
  duaReferencesController.create,
);
router.get('/', duaReferencesController.findAll);
router.patch(
  '/:referenceId',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(updateDuaReferenceZodSchema),
  duaReferencesController.update,
);
router.delete('/:referenceId', checkAuth('ADMIN', 'MODERATOR'), duaReferencesController.remove);

export const duaReferencesRoutes = router;
