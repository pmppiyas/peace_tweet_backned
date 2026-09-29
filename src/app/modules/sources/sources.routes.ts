import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { sourcesController } from './sources.controller';
import { createSourceZodSchema, updateSourceZodSchema } from './sources.validation';

const router = Router();

router.post(
  '/',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(createSourceZodSchema),
  sourcesController.create,
);
router.get('/', sourcesController.findAll);
router.get('/:id', sourcesController.findOne);
router.patch(
  '/:id',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(updateSourceZodSchema),
  sourcesController.update,
);
router.delete('/:id', checkAuth('ADMIN', 'MODERATOR'), sourcesController.remove);

export const sourcesRoutes = router;
