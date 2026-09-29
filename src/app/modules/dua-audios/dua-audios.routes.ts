import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { duaAudiosController } from './dua-audios.controller';
import { createDuaAudioZodSchema, updateDuaAudioZodSchema } from './dua-audios.validation';

const router = Router({ mergeParams: true });

router.post(
  '/',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(createDuaAudioZodSchema),
  duaAudiosController.create,
);
router.get('/', duaAudiosController.findAll);
router.patch(
  '/:audioId',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(updateDuaAudioZodSchema),
  duaAudiosController.update,
);
router.delete('/:audioId', checkAuth('ADMIN', 'MODERATOR'), duaAudiosController.remove);

export const duaAudiosRoutes = router;
