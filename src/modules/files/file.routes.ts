import { Router } from 'express';
import { FileController } from './file.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkPermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { uploadSingle, uploadMultiple } from '../../config/multer';
import {
  uploadFileSchema,
  fileQuerySchema,
  fileSearchSchema,
} from './file.validator';

const router = Router();
const controller = new FileController();

router.use(authMiddleware);

router.get(
  '/',
  validate(fileQuerySchema, 'query'),
  checkPermission('file.read'),
  controller.getFiles
);

router.get(
  '/stats',
  checkPermission('file.read'),
  controller.getFileStats
);

router.get(
  '/:id',
  checkPermission('file.read'),
  controller.getFileById
);

router.get(
  '/:id/download',
  checkPermission('file.read'),
  controller.downloadFile
);

router.post(
  '/upload',
  uploadSingle('file'),
  validate(uploadFileSchema),
  checkPermission('file.write'),
  controller.uploadFile
);

router.post(
  '/upload-multiple',
  uploadMultiple('files', 10),
  validate(uploadFileSchema),
  checkPermission('file.write'),
  controller.uploadMultipleFiles
);

router.post(
  '/search',
  validate(fileSearchSchema),
  checkPermission('file.read'),
  controller.searchFiles
);

router.delete(
  '/:id',
  checkPermission('file.delete'),
  controller.deleteFile
);

export default router;
