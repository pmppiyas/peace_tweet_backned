import { Router } from 'express';
import { checkAuth, optionalAuth } from '../../middleware/checkAuth';
import { validateRequest } from '../../middleware/validateRequest';
import { commentsController } from './comments.controller';
import {
  createCommentZodSchema,
  updateCommentZodSchema,
} from './comments.validation';

const router = Router();

// GET /api/v1/comments?postId=...
router.get('/', optionalAuth(), commentsController.getComments);

// GET /api/v1/comments/post/:postId
router.get('/post/:postId', optionalAuth(), commentsController.getComments);

// GET /api/v1/comments/:id
router.get('/:id', optionalAuth(), commentsController.findOne);

// POST /api/v1/comments (Create comment or reply via { postId, content, parentId? })
router.post(
  '/',
  checkAuth(),
  validateRequest(createCommentZodSchema),
  commentsController.createComment,
);

// POST /api/v1/comments/:commentId/replies (Reply directly to a comment)
router.post(
  '/:commentId/replies',
  checkAuth(),
  validateRequest(createCommentZodSchema),
  commentsController.createComment,
);

// PATCH /api/v1/comments/:id (Edit comment)
router.patch(
  '/:id',
  checkAuth(),
  validateRequest(updateCommentZodSchema),
  commentsController.updateComment,
);

// DELETE /api/v1/comments/:id (Delete comment & its replies)
router.delete('/:id', checkAuth(), commentsController.deleteComment);

export const commentsRoutes = router;
