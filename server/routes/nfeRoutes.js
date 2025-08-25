import express from 'express';
import { listNfes, getNfe, createNfe, updateNfeController, deleteNfeController } from '../controllers/nfeController.js';

const router = express.Router();

router.get('/', listNfes);
router.get('/:id', getNfe);
router.post('/', createNfe);
router.put('/:id', updateNfeController);
router.delete('/:id', deleteNfeController);

export default router;
