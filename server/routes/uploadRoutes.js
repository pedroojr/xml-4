import express from 'express';
import multer from 'multer';
import { uploadXml } from '../controllers/uploadController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/upload-xml', upload.single('xml'), uploadXml);

export default router;
