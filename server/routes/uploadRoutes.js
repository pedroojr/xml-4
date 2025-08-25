import express from 'express';
import multer from 'multer';
import { check } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { uploadXml } from '../controllers/uploadController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post(
  '/upload-xml',
  upload.single('xml'),
  [
    check('xml').custom((value, { req }) => {
      if (!req.file) {
        throw new Error('Arquivo XML é obrigatório');
      }
      if (
        req.file.mimetype !== 'text/xml' &&
        !req.file.originalname.toLowerCase().endsWith('.xml')
      ) {
        throw new Error('Formato de arquivo inválido');
      }
      return true;
    })
  ],
  validate,
  uploadXml
);

export default router;
