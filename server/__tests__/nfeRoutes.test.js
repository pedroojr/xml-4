import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { authMiddleware } from '../middleware/auth.js';
import config from '../config/index.js';

await jest.unstable_mockModule('../models/nfeModel.js', () => ({
  getAllNfes: jest.fn(),
  getNfeById: jest.fn(),
  getNfeByChave: jest.fn(),
  saveNfe: jest.fn(),
  updateNfe: jest.fn(),
  deleteNfe: jest.fn(),
}));

const { getAllNfes, getNfeById, getNfeByChave, saveNfe } = await import('../models/nfeModel.js');
const nfeRoutes = (await import('../routes/nfeRoutes.js')).default;

const app = express();
app.use(express.json());
app.use(authMiddleware);
app.use('/api/nfes', nfeRoutes);

config.apiKey = 'testkey';

describe('GET /api/nfes', () => {
  it('should return list of NFEs', async () => {
    getAllNfes.mockReturnValue([{ id: '1' }]);
    const res = await request(app)
      .get('/api/nfes')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: '1' }]);
  });
});

describe('GET /api/nfes/:id', () => {
  it('should return the NFE when found', async () => {
    getNfeById.mockReturnValue({ id: '123' });
    const res = await request(app)
      .get('/api/nfes/123')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '123' });
  });

  it('should return 404 when NFE is not found', async () => {
    getNfeById.mockReturnValue(null);
    const res = await request(app)
      .get('/api/nfes/123')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NFE não encontrada' });
  });
});

describe('POST /api/nfes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new NFE', async () => {
    saveNfe.mockReturnValue('1');
    const res = await request(app)
      .post('/api/nfes')
      .set('x-api-key', 'testkey')
      .send({ id: '1', fornecedor: 'Teste', valor: 100 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'NFE salva com sucesso', id: '1' });
    expect(saveNfe).toHaveBeenCalledWith({
      id: '1',
      fornecedor: 'Teste',
      valor: 100,
    });
  });

  it('should return 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/api/nfes')
      .set('x-api-key', 'testkey')
      .send({ fornecedor: 'Teste' });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
