import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { authMiddleware } from '../middleware/auth.js';
import config from '../config/index.js';

process.env.REDIS_HOST = 'redis';

await jest.unstable_mockModule('../queues/nfeQueue.js', () => ({
  default: { add: jest.fn().mockResolvedValue({ id: 'job123' }) },
}));

const { default: nfeQueue } = await import('../queues/nfeQueue.js');
const uploadRoutes = (await import('../routes/uploadRoutes.js')).default;

config.apiKey = 'testkey';

const app = express();
app.use(authMiddleware);
app.use('/api', uploadRoutes);

describe('POST /api/upload-xml', () => {
  it('should enqueue XML file successfully', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <NFe>
      <infNFe Id="NFe123">
        <ide>
          <nNF>1</nNF>
          <dhEmi>2024-01-01T00:00:00-03:00</dhEmi>
        </ide>
        <emit>
          <xNome>Fornecedor Teste</xNome>
        </emit>
        <det nItem="1">
          <prod>
            <cProd>001</cProd>
            <xProd>Produto Teste</xProd>
            <NCM>1234</NCM>
            <CFOP>5102</CFOP>
            <uCom>UN</uCom>
            <qCom>1</qCom>
            <vUnCom>10.00</vUnCom>
            <vProd>10.00</vProd>
          </prod>
        </det>
        <total>
          <ICMSTot>
            <vNF>10.00</vNF>
          </ICMSTot>
        </total>
      </infNFe>
    </NFe>`;

    const res = await request(app)
      .post('/api/upload-xml')
      .set('x-api-key', 'testkey')
      .attach('xml', Buffer.from(xml), 'file.xml');
    expect(res.status).toBe(202);
    expect(res.body.id).toBe('job123');
    expect(nfeQueue.add).toHaveBeenCalledTimes(1);
  });

  it('should return 400 when no file is provided', async () => {
    nfeQueue.add.mockClear();
    const res = await request(app)
      .post('/api/upload-xml')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(nfeQueue.add).not.toHaveBeenCalled();
  });
});
