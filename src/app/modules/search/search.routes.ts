import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { searchController } from './search.controller';
import { addSearchHistoryZodSchema } from './search.validation';

const router = Router();

// Global fast search across Users, Duas, Groups, Posts
router.get('/', optionalAuth(), searchController.searchGlobal);

// Recent search history
router.get('/history', checkAuth(), searchController.getSearchHistory);

router.post(
  '/history',
  checkAuth(),
  validateRequest(addSearchHistoryZodSchema),
  searchController.addSearchHistory,
);

router.delete('/history/:id', checkAuth(), searchController.deleteSearchHistoryItem);

router.delete('/history', checkAuth(), searchController.clearSearchHistory);

export const searchRoutes = router;
