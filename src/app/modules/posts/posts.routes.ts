import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { postsController } from './posts.controller';
import {
  createCommentZodSchema,
  createPostZodSchema,
  updatePostZodSchema,
} from './posts.validation';

const router = Router();

router.get('/', optionalAuth(), postsController.getFeed);
router.post('/', checkAuth(), validateRequest(createPostZodSchema), postsController.create);
router.get('/:id', optionalAuth(), postsController.findOne);
router.patch('/:id', checkAuth(), validateRequest(updatePostZodSchema), postsController.update);
router.delete('/:id', checkAuth(), postsController.remove);
router.post('/:postId/save', checkAuth(), postsController.savePost);
router.delete('/:postId/save', checkAuth(), postsController.unsavePost);
router.post('/:postId/reaction', checkAuth(), postsController.react);
router.delete('/:postId/reaction', checkAuth(), postsController.unreact);
router.get('/:postId/comments', postsController.getComments);
router.post(
  '/:postId/comments',
  checkAuth(),
  validateRequest(createCommentZodSchema),
  postsController.createComment,
);

export const postsRoutes = router;

export const feedRoutes = Router();
feedRoutes.get('/', optionalAuth(), postsController.getFeed);
