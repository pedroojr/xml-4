import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { authMiddleware } from '../middleware/auth.js';
import config from '../config/index.js';

await jest.unstable_mockModule('../models/nfeModel.js', () => ({
  getAllNfes: jest.fn(),
  getNfeById: jest.fn(),
  saveNfe: jest.fn(),
  updateNfe: jest.fn(),
  deleteNfe: jest.fn(),
}));

const { getAllNfes, getNfeById } = await import('../models/nfeModel.js');
const nfeRoutes = (await import('./nfeRoutes.js')).default;

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
  it('should return 404 when NFE is not found', async () => {
    getNfeById.mockReturnValue(null);
    const res = await request(app)
      .get('/api/nfes/123')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NFE não encontrada' });
  });
});
