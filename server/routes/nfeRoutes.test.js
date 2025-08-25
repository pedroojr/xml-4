import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

await jest.unstable_mockModule('../models/nfeModel.js', () => ({
  getAllNfes: jest.fn(),
  getNfeById: jest.fn(),
  saveNfe: jest.fn(),
  updateNfe: jest.fn(),
  deleteNfe: jest.fn(),
}));

const { getAllNfes } = await import('../models/nfeModel.js');
const nfeRoutes = (await import('./nfeRoutes.js')).default;

const app = express();
app.use(express.json());
app.use('/api/nfes', nfeRoutes);

describe('GET /api/nfes', () => {
  it('should return list of NFEs', async () => {
    getAllNfes.mockReturnValue([{ id: '1' }]);
    const res = await request(app).get('/api/nfes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: '1' }]);
  });
});
