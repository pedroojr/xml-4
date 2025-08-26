import logger from '../utils/logger.js';
import nfeQueue from '../queues/nfeQueue.js';
import { parseStringPromise } from 'xml2js';
import { saveNfe } from '../models/nfeModel.js';

export const uploadXml = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const xmlContent = req.file.buffer.toString('utf-8');
    if (process.env.REDIS_HOST) {
      const job = await nfeQueue.add('processNfe', { xml: xmlContent });
      return res.status(202).json({ id: job.id });
    }

    const parsed = await parseStringPromise(xmlContent, { explicitArray: false });
    const infNFe =
      parsed?.nfeProc?.NFe?.infNFe || parsed?.NFe?.infNFe || parsed?.infNFe;
    if (!infNFe) {
      return res.status(400).json({ error: 'Estrutura de NFE inválida' });
    }

    const chave = (infNFe.$?.Id || '').replace(/^NFe/, '');
    const detArray = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
    const produtos = detArray.map((det) => {
      const p = det.prod;
      return {
        codigo: p.cProd,
        descricao: p.xProd,
        ncm: p.NCM,
        cfop: p.CFOP,
        unidade: p.uCom,
        quantidade: Number(p.qCom),
        valorUnitario: Number(p.vUnCom),
        valorTotal: Number(p.vProd),
      };
    });

    const nfeData = {
      id: chave || infNFe.ide?.nNF,
      data: infNFe.ide?.dhEmi || infNFe.ide?.dEmi,
      numero: infNFe.ide?.nNF,
      chaveNFE: chave,
      fornecedor: infNFe.emit?.xNome,
      valor: Number(infNFe.total?.ICMSTot?.vNF || 0),
      itens: produtos.length,
      produtos,
    };

    saveNfe(nfeData);
    res.status(201).json({ id: nfeData.id });
  } catch (error) {
    logger.error(`Erro no upload: ${error}`);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};

