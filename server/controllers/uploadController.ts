import { Request, Response } from 'express';
import logger from '../utils/logger.js';
import nfeQueue from '../queues/nfeQueue.js';

export const uploadXml = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const xmlContent = req.file.buffer.toString('utf-8');
    const job = await nfeQueue.add('processNfe', { xml: xmlContent });
    res
      .status(202)
      .json({ message: 'NFE enfileirada com sucesso', jobId: job.id });
  } catch (error: any) {
    logger.error(`Erro no upload: ${error}`);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};
