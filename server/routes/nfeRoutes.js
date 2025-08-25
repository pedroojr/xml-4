import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { listNfes, getNfe, createNfe, updateNfeController, deleteNfeController } from '../controllers/nfeController.js';

const router = express.Router();

router.get('/', listNfes);
router.get('/:id', [param('id').isString().notEmpty()], validate, getNfe);
router.post('/', [
  body('id').isString().notEmpty(),
  body('data').optional().isString(),
  body('numero').optional().isString(),
  body('chaveNFE').optional().isString(),
  body('fornecedor').optional().isString(),
  body('valor').optional().isNumeric(),
  body('itens').optional().isNumeric(),
  body('produtos').optional().isArray(),
  body('impostoEntrada').optional().isNumeric(),
  body('xapuriMarkup').optional().isNumeric(),
  body('epitaMarkup').optional().isNumeric(),
  body('roundingType').optional().isString(),
  body('valorFrete').optional().isNumeric(),
  body('hiddenItems').optional().isArray(),
  body('showHidden').optional().isBoolean()
], validate, createNfe);
router.put('/:id', [
  param('id').isString().notEmpty(),
  body('fornecedor').optional().isString(),
  body('impostoEntrada').optional().isNumeric(),
  body('xapuriMarkup').optional().isNumeric(),
  body('epitaMarkup').optional().isNumeric(),
  body('roundingType').optional().isString(),
  body('valorFrete').optional().isNumeric(),
  body('hiddenItems').optional().isArray(),
  body('showHidden').optional().isBoolean()
], validate, updateNfeController);
router.delete('/:id', [param('id').isString().notEmpty()], validate, deleteNfeController);

export default router;
