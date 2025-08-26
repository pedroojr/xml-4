import express from 'express';
import multer from 'multer';
import { check } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { uploadXml } from '../controllers/uploadController.js';
import config from '../config/index.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

const xmlValidation = [
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
];

router.post('/upload-xml', upload.single('xml'), xmlValidation, validate, uploadXml);
router.post('/upload', upload.single('xml'), xmlValidation, validate, uploadXml);

export default router;
