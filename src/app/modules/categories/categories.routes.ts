import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { categoriesController } from './categories.controller';
import { createCategoryZodSchema, updateCategoryZodSchema } from './categories.validation';

const router = Router();

router.post(
  '/',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(createCategoryZodSchema),
  categoriesController.create,
);
router.get('/', categoriesController.findAll);
router.get('/:id', categoriesController.findOne);
router.patch(
  '/:id',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(updateCategoryZodSchema),
  categoriesController.update,
);
router.delete('/:id', checkAuth('ADMIN', 'MODERATOR'), categoriesController.remove);

export const categoriesRoutes = router;
