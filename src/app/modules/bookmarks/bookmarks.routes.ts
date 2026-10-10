import { Router } from 'express';
import { checkAuth } from '../../middleware/checkAuth';
import { bookmarksController } from './bookmarks.controller';

const router = Router();

router.post('/duas/:duaId/save', checkAuth(), bookmarksController.saveDua);
router.delete('/duas/:duaId/save', checkAuth(), bookmarksController.unsaveDua);
router.get('/users/me/saved-duas', checkAuth(), bookmarksController.getSavedDuas);
router.get('/users/me/saved', checkAuth(), bookmarksController.getSaved);
router.patch('/saved/time-slot', checkAuth(), bookmarksController.updateTimeSlot);

export const bookmarksRoutes = router;
