import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { bookmarksController } from '../bookmarks/bookmarks.controller';
import { duasController } from './duas.controller';
import { createDuaZodSchema, updateDuaZodSchema } from './duas.validation';

const router = Router();

router.post(
  '/',
  checkAuth(),
  validateRequest(createDuaZodSchema),
  duasController.create,
);
router.get('/', optionalAuth(), duasController.findAll);
router.post('/:duaId/save', checkAuth(), bookmarksController.saveDua);
router.delete('/:duaId/save', checkAuth(), bookmarksController.unsaveDua);
router.get('/:id', optionalAuth(), duasController.findOne);
router.patch(
  '/:id',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(updateDuaZodSchema),
  duasController.update,
);
router.delete('/:id', checkAuth('ADMIN', 'MODERATOR'), duasController.remove);

export const duasRoutes = router;
