import express from 'express';
import { getDbInfo } from '../controllers/debugController.js';

const router = express.Router();

router.get('/_debug/db', getDbInfo);

export default router;
