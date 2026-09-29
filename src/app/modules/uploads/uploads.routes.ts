import { Router } from 'express';
import multer from 'multer';
import { checkAuth } from '../../middleware/checkAuth';
import { uploadsController } from './uploads.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/image', upload.single('file'), uploadsController.uploadImage);
router.post('/avatar', checkAuth(), upload.single('file'), uploadsController.uploadAvatar);

export const uploadsRoutes = router;
