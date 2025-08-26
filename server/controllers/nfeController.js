import { getAllNfes, getNfeById, getNfeByChave, saveNfe, updateNfe, deleteNfe } from '../models/nfeModel.js';
import logger from '../utils/logger.js';

export const listNfes = (req, res) => {
  try {
    const nfes = getAllNfes();
    res.json(nfes);
  } catch (error) {
    logger.error(`Erro ao buscar NFEs: ${error}`);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getNfe = (req, res) => {
  try {
    const nfe = getNfeById(req.params.id);
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    res.json(nfe);
  } catch (error) {
    logger.error(`Erro ao buscar NFE: ${error}`);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createNfe = (req, res) => {
  try {
    // Bloquear tentativa de criar NFE com chave já existente
    if (req.body?.chaveNFE) {
      const exists = getNfeByChave(req.body.chaveNFE);
      if (exists) {
        return res.status(409).json({ error: 'NFE já cadastrada com esta chave' });
      }
    }
    const id = saveNfe(req.body);
    res.json({ message: 'NFE salva com sucesso', id });
  } catch (error) {
    logger.error(`Erro ao salvar NFE: ${error}`);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateNfeController = (req, res) => {
  try {
    const changes = updateNfe(req.params.id, req.body);
    if (changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    res.json({ message: 'NFE atualizada com sucesso' });
  } catch (error) {
    logger.error(`Erro ao atualizar NFE: ${error}`);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteNfeController = (req, res) => {
  try {
    const changes = deleteNfe(req.params.id);
    if (changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    res.json({ message: 'NFE excluída com sucesso' });
  } catch (error) {
    logger.error(`Erro ao excluir NFE: ${error}`);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

