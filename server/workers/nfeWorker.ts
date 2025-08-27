import { Worker } from 'bullmq';
import { parseStringPromise } from 'xml2js';
import { saveNfe } from '../models/nfeModel.js';
import logger from '../utils/logger.js';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
};

const worker = new Worker(
  'nfeQueue',
  async (job) => {
    const { xml } = job.data;
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const infNFe =
      parsed?.nfeProc?.NFe?.infNFe || parsed?.NFe?.infNFe || parsed?.infNFe;
    if (!infNFe) {
      throw new Error('Estrutura de NFE inválida');
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

      saveNfe(nfeData as any);
    },
  { connection }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

export default worker;
